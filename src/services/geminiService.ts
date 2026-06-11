
import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { ClinicalState, ClinicalLabs, Vitals, Differential, ManagementStep, AdversarialPoint, PatientProfile } from "../types";

const getAI = (): GoogleGenAI => {
  // Use explicit import.meta.env for Vite static replacement
  let viteGeminiKey = "";
  let viteApiKey = "";
  
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      viteGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      viteApiKey = import.meta.env.VITE_API_KEY || "";
    }
  } catch (e) {
    // Ignore errors in non-Vite environments
  }

  // Check window.process.env first (injected by server.ts), then process.env (Node.js/Vite define)
  const windowEnv = typeof window !== 'undefined' && (window as any).process?.env ? (window as any).process.env : {};

  const apiKey = 
    viteGeminiKey || 
    viteApiKey || 
    windowEnv.GEMINI_API_KEY ||
    windowEnv.API_KEY ||
    process.env.GEMINI_API_KEY || 
    process.env.API_KEY || 
    "";
  
  return new GoogleGenAI({ apiKey });
};

export interface ExtractedClinicalData {
  labs: Partial<ClinicalLabs>;
  vitals: Partial<Vitals>;
  status?: ClinicalState['status'];
  weightKg?: number;
  age?: number;
  gender?: 'Male' | 'Female';
  patientName?: string;
  historyNote: string;
  scores: ClinicalState['scores'];
  missingData: string[];
  differentials: Differential[];
  provisionalDiagnosis?: string;
  directionalQuery?: string;
  managementPlan?: ManagementStep[];
  adversarialAnalysis?: {
    summary: string;
    points: AdversarialPoint[];
  };
  trendAnalysis?: string;
  suggestedSteps?: {
    type: 'history' | 'exam' | 'test';
    label: string;
    reason: string;
  }[];
  trajectory?: ClinicalState['trajectory'];
  blindspots?: ClinicalState['blindspots'];
  debate?: ClinicalState['debate'];
  timeline?: ClinicalState['timeline'];
}

export const extractNotesFromImages = async (images: {data: string, mimeType: string}[]): Promise<string> => {
  try {
    const parts: any[] = images.map(img => ({
      inlineData: {
        data: img.data.split(',')[1] || img.data,
        mimeType: img.mimeType,
      }
    }));
    
    parts.push({
      text: `Analyze these images of clinical progress notes and/or lab results.
      
      Extract all relevant clinical information, including:
      - Subjective complaints and history
      - Objective physical exam findings and vitals
      - Assessment and Differential Diagnoses
      - Plan (medications, procedures, follow-ups)
      - Any laboratory values or results
      
      Output the extracted information as a comprehensive, highly structured clinical note. Do not invent any information. If something is illegible, note it as [illegible].`
    });

    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: "You are an expert OCR and clinical scribe assistant. Accurately transcribe and structure handwritten or printed medical notes and lab reports into a clean, professional clinical summary.",
      }
    });

    return response.text || "Failed to extract notes from images.";
  } catch (error) {
    console.error("Notes extraction failed:", error);
    throw new Error("Failed to process notes images. Please try again.");
  }
};

export const interpretMedicalImage = async (base64Image: string, mimeType: string, context: string = ""): Promise<string> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this medical image (ECG, Echo, CT, MRI, X-ray, etc.). 
            
            Patient Context: "${context}"
            
            Provide a structured interpretation including:
            1. Modality and Quality
            2. Primary Findings
            3. Secondary/Incidental Findings
            4. Clinical Impression
            5. Recommendations
            
            Keep it concise, professional, and directly relevant to the patient context.`,
          },
        ],
      },
      config: {
        systemInstruction: "You are an expert radiologist and cardiologist AI assistant. You provide highly accurate, structured interpretations of medical imaging.",
      }
    });

    return response.text || "No interpretation provided.";
  } catch (error) {
    console.error("Image interpretation failed:", error);
    throw new Error("Failed to interpret medical image. Please ensure the image is clear and try again.");
  }
};

export const compileTranscript = async (transcript: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: "gemini-flash-latest",
    contents: `
      Analyze this raw clinical transcript (which may be in any language, e.g., English, Urdu, Arabic, French, German, Chinese, etc.):
      "${transcript}"
      
      Your task is to generate a highly professional, comprehensive, and meticulously structured SOAP note.
      
      SOAP NOTE STANDARDS:
      - **Subjective:** Capture the Chief Complaint (CC) in the patient's own words if possible. Detail the History of Present Illness (HPI) using the OPQRST (Onset, Provocation, Quality, Radiation, Severity, Time) or OLD CARTS (Onset, Location, Duration, Character, Aggravating/Alleviating factors, Radiation, Timing, Severity) framework. Include a thorough Review of Systems (ROS), Past Medical History (PMH), Past Surgical History (PSH), Medications (including dosage/frequency if mentioned), Allergies, Social History (SH), and Family History (FH).
      - **Objective:** List all Vital Signs (Temp, HR, RR, BP, SpO2). Document Physical Exam findings by system (HEENT, Cardiovascular, Respiratory, Abdomen, Neurological, Musculoskeletal, Skin). Include any Lab results or Imaging findings mentioned.
      - **Assessment:** Provide a clear Primary Diagnosis. List Differential Diagnoses (DDx) in order of likelihood, with a brief clinical justification for each.
      - **Plan:** Detail the diagnostic plan (further tests), therapeutic plan (medications, procedures), patient education/counseling, and follow-up instructions (including "return to ER" criteria).

      CRITICAL INSTRUCTIONS:
      1. TRANSLATE: Translate the entire conversation to professional medical English.
      2. RETAIN ALL CLINICAL CONTEXT: You MUST catch and include ALL clinical information mentioned in the transcript. Do not miss ANY symptoms, durations, severities, medications, past medical history, social history, family history, allergies, vitals, physical exam findings, patient concerns, or plans. Even if a detail seems minor or is mentioned casually, if it relates to the patient's health, it MUST be in the note.
      3. FILTER ONLY PURE NOISE: Remove casual greetings ("hello", "how are you"), conversational fillers ("um", "uh"), and completely off-topic chatter (e.g., talking about the weather). DO NOT filter out any patient complaints or doctor observations.
      4. NO HALLUCINATION: Focus strictly on the information provided in this specific transcript. Do not invent or assume information that isn't explicitly mentioned.
      5. NO REMARKS: Do not include any introductory or concluding remarks, just the compiled SOAP note starting with the Subjective section.
    `,
    config: {
      systemInstruction: "You are an elite medical scribe. Your primary job is to generate flawless, comprehensive SOAP notes from ambient dictations. You MUST capture every single clinically relevant detail without exception. Do not summarize away important nuances.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text?.trim() || "Failed to compile SOAP notes.";
};

export const parseAmbientTranscript = async (transcript: string, previousHistory: string = ""): Promise<ExtractedClinicalData> => {
  const response = await getAI().models.generateContent({
    model: "gemini-flash-latest",
    contents: `
      Analyze this clinical transcript: "${transcript}"
      
      Context from previous history (Trend context): "${previousHistory}"
      
      Your task:
      1. TRANSLATE & RETAIN: The transcript may be in any language or a mix. Translate it internally to English. You MUST completely ignore pure conversational filler, but you MUST NOT drop any clinical details, symptoms, patient concerns, or observations, no matter how casually they are mentioned.
      2. EXHAUSTIVE EXTRACTION: You MUST catch ALL necessary clinical information mentioned in the transcript. Do not miss any symptoms, durations, severities, medications, past medical history, social history, family history, allergies, or physical exam findings.
      3. HISTORY NOTE (SOAP FORMAT): Generate a highly professional, comprehensive clinical note in strict SOAP format (Subjective, Objective, Assessment, Plan) for THIS encounter. 
         - Subjective: Include Chief Complaint (CC), History of Present Illness (HPI) using OPQRST/OLD CARTS, Review of Systems (ROS), Past Medical/Surgical History, Medications, Allergies, Social History, and Family History.
         - Objective: Include all mentioned Vitals, Physical Exam findings by system, and Lab/Imaging results.
         - Assessment: Include the primary diagnosis and a prioritized list of differential diagnoses.
         - Plan: Include all mentioned treatments, medications (dose/route/freq), follow-up instructions, and patient education.
         Do NOT repeat information from the 'previous history' context unless it is being explicitly discussed or updated in the current transcript.
      4. DATA EXTRACTION: Extract all provided quantitative and qualitative clinical data (labs, vitals, status, weight, age, gender, patientName). If a patient name is mentioned (e.g., "Patient Joe", "Mr. Smith"), extract it precisely.
      5. CALCULATE SCORES: Based on available data, calculate relevant scores (Anion Gap, CrCl, etc.).
      6. DIRECTIONAL GUIDANCE: Provide a single most important next action.
      7. Identify essential missing data.
      8. Generate provisional differential diagnoses (even if the input is brief, provide the most likely possibilities based on the symptoms).
      9. Provide a guideline-directed management plan if diagnosis is clear.
      10. PERFORM ADVERSARIAL ANALYSIS: Act as a clinical devil's advocate. Challenge the most obvious diagnosis.
      11. TREND ASSESSMENT: Compare current findings with previous history.
      12. SUGGESTED STEPS: Provide 3-5 high-yield next steps for history taking or physical examination that are CRITICAL for the current context.
      13. TRAJECTORY PREDICTION: Predict what may happen next (e.g., risk of septic shock, AKI) and suggest preventive steps.
      14. BLINDSPOT DETECTOR: Review the encounter and flag things physicians might miss.
      15. MULTI-AGENT DEBATE: Simulate multiple AI agents arguing like senior attendings.
      16. DYNAMIC TIMELINE: Build a living timeline of the patient based on the transcript and history.
      
      CRITICAL: You MUST populate all required fields in the JSON response. Do not leave arrays empty unless absolutely necessary. For differentials, always provide at least 2-3 possibilities.
    `,
    config: {
      systemInstruction: "You are an elite medical scribe and clinical reasoning assistant. Your primary job is to generate flawless, comprehensive SOAP notes from ambient dictations. You MUST capture every single clinically relevant detail (symptoms, meds, history, vitals, plans) without exception. Do not summarize away important nuances.",
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          labs: {
            type: Type.OBJECT,
            properties: {
              glucose: { type: Type.NUMBER },
              sodium: { type: Type.NUMBER },
              potassium: { type: Type.NUMBER },
              chloride: { type: Type.NUMBER },
              bicarbonate: { type: Type.NUMBER },
              bun: { type: Type.NUMBER },
              creatinine: { type: Type.NUMBER },
              calcium: { type: Type.NUMBER },
              ast: { type: Type.NUMBER },
              alt: { type: Type.NUMBER },
              alp: { type: Type.NUMBER },
              bilirubin: { type: Type.NUMBER },
              albumin: { type: Type.NUMBER },
              totalProtein: { type: Type.NUMBER },
              wbc: { type: Type.NUMBER },
              hgb: { type: Type.NUMBER },
              hct: { type: Type.NUMBER },
              plt: { type: Type.NUMBER },
              ph: { type: Type.NUMBER },
              pco2: { type: Type.NUMBER },
              po2: { type: Type.NUMBER },
              lactate: { type: Type.NUMBER },
              troponin: { type: Type.STRING },
              bnp: { type: Type.NUMBER },
              inr: { type: Type.NUMBER },
              pt: { type: Type.NUMBER },
              ptt: { type: Type.NUMBER },
              crp: { type: Type.NUMBER },
              esr: { type: Type.NUMBER },
              ketones: { type: Type.STRING },
              anionGap: { type: Type.NUMBER }
            }
          },
          vitals: {
            type: Type.OBJECT,
            properties: {
              bp_sys: { type: Type.NUMBER },
              bp_dia: { type: Type.NUMBER },
              hr: { type: Type.NUMBER },
              rr: { type: Type.NUMBER },
              temp: { type: Type.NUMBER },
              spo2: { type: Type.NUMBER }
            }
          },
          status: { type: Type.STRING },
          weightKg: { type: Type.NUMBER },
          age: { type: Type.NUMBER },
          gender: { type: Type.STRING },
          patientName: { type: Type.STRING },
          historyNote: { type: Type.STRING, description: "A concise clinical note in SOAP format (Subjective, Objective, Assessment, Plan) for the current encounter only, excluding noise and previous history." },
          scores: {
            type: Type.OBJECT,
            properties: {
              anionGap: { type: Type.NUMBER },
              crCl: { type: Type.NUMBER },
              timi: { type: Type.NUMBER },
              grace: { type: Type.NUMBER },
              qsofa: { type: Type.NUMBER },
              curb65: { type: Type.NUMBER }
            }
          },
          missingData: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          differentials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                likelihood: { type: Type.STRING },
                reasoning: { type: Type.STRING }
              },
              required: ["name", "likelihood", "reasoning"]
            }
          },
          provisionalDiagnosis: { type: Type.STRING },
          directionalQuery: { type: Type.STRING },
          managementPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                guidelineSource: { type: Type.STRING },
                reasoning: { type: Type.STRING }
              },
              required: ["action", "guidelineSource", "reasoning"]
            }
          },
          adversarialAnalysis: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              points: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    finding: { type: Type.STRING },
                    contradicts: { type: Type.STRING },
                    significance: { type: Type.STRING }
                  },
                  required: ["finding", "contradicts", "significance"]
                }
              }
            },
            required: ["summary", "points"]
          },
          trendAnalysis: { type: Type.STRING },
          suggestedSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['history', 'exam', 'test'] },
                label: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["type", "label", "reason"]
            }
          },
          trajectory: {
            type: Type.OBJECT,
            properties: {
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    condition: { type: Type.STRING },
                    probability: { type: Type.STRING }
                  },
                  required: ["condition", "probability"]
                }
              },
              preventiveSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["risks", "preventiveSteps"]
          },
          blindspots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issue: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
              },
              required: ["issue", "severity"]
            }
          },
          debate: {
            type: Type.OBJECT,
            properties: {
              guidelineAgent: { type: Type.STRING },
              safetyAgent: { type: Type.STRING },
              riskAgent: { type: Type.STRING },
              finalRecommendation: { type: Type.STRING }
            },
            required: ["guidelineAgent", "safetyAgent", "riskAgent", "finalRecommendation"]
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                event: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['admission', 'vital', 'lab', 'diagnosis', 'treatment'] }
              },
              required: ["time", "event", "type"]
            }
          }
        },
        required: ["historyNote", "missingData", "differentials", "provisionalDiagnosis", "directionalQuery", "managementPlan", "adversarialAnalysis", "trendAnalysis", "scores", "suggestedSteps", "trajectory", "blindspots", "debate", "timeline"]
      }
    }
  });

  try {
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    const parsed = JSON.parse(jsonStr);
    console.log("Parsed Ambient Transcript:", parsed);
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { 
      historyNote: "Failed to extract data.", 
      labs: {}, 
      vitals: {}, 
      scores: {},
      missingData: ["System error in extraction"],
      differentials: [],
      adversarialAnalysis: { summary: "Analysis unavailable", points: [] }
    };
  }
};

export const generateManagementPlan = async (clinicalState: string): Promise<ManagementStep[]> => {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Based on the following clinical state, generate an automatic, scenario-relevant management plan.
      
      Clinical State:
      ${clinicalState}
      
      CRITICAL INSTRUCTIONS:
      1. Provide a step-by-step guideline-directed management plan (e.g., AHA/ACC, KDIGO, GOLD, GINA, Surviving Sepsis Campaign).
      2. Run drug interaction checks for any proposed medications and list them in 'drugInteractions'.
      3. Calculate CrCl dose adjustments if renal function labs (e.g., creatinine, age, weight) are available and put in 'crclDoseAdjustment'.
      4. Note any specific drug toxicity warnings or monitoring required in 'toxicityWarnings'.
      5. Each step must include the action, the specific guideline source/rationale, and detailed reasoning.
      6. Include "return to ER" criteria and specific follow-up intervals.
    `,
    config: {
      systemInstruction: "You are an expert clinical pharmacist and attending physician. You provide precise, guideline-based management plans with rigorous attention to drug interactions, renal dosing (CrCl), and toxicity monitoring.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            guidelineSource: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            drugInteractions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            crclDoseAdjustment: { type: Type.STRING },
            toxicityWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["action", "guidelineSource", "reasoning"]
        }
      }
    }
  });

  try {
    let jsonStr = (response.text || "[]").trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse management plan", e);
    return [];
  }
};

export const simulateWhatIf = async (scenario: string, clinicalContext: string) => {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      You are an AI "What-If" Simulator for a medical application.
      
      Clinical Context:
      ${clinicalContext}
      
      Doctor's "What-If" Scenario:
      "${scenario}"
      
      Predict the effects of this scenario based on established clinical evidence and physiological principles. 
      Focus on:
      - Mortality risk changes (quantify if possible).
      - Probability of critical complications (e.g., septic shock, AKI, ARDS, MI).
      - Physiological changes (e.g., "Expected drop in MAP", "Potential for hyperkalemia").
      - Impact on length of stay or recovery trajectory.
      
      Return a JSON object with:
      1. "predictedEffects": An array of strings describing the predicted effects.
      2. "reasoning": A detailed clinical explanation of why these effects are predicted, citing relevant pathophysiology.
    `,
    config: {
      systemInstruction: "You are a predictive clinical AI. Provide direct, quantitative (when possible), and realistic predictions based on the scenario.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictedEffects: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["predictedEffects", "reasoning"]
      }
    }
  });

  try {
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse What-If response", e);
    throw new Error("Failed to simulate scenario");
  }
};
export const generatePeerReply = async (patientData: any, chatHistory: any[]) => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a peer physician participating in a clinical case discussion.
        
        Patient Case Details:
        ${JSON.stringify(patientData, null, 2)}
        
        Recent Chat History:
        ${JSON.stringify(chatHistory, null, 2)}
        
        Provide a helpful, insightful, and professional response to the latest message. Ask a relevant clinical question, suggest a differential diagnosis, or recommend a management step. Keep your response concise (1-3 sentences) and conversational, as if in a chat room. Do not use markdown formatting.
      `,
      config: {
        systemInstruction: "You are an expert peer physician collaborating on a case.",
      }
    });

    return response.text || "I'm currently reviewing the case details. Please hold on.";
  } catch (error) {
    console.error("Error generating peer reply:", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
};

export const generateManuscript = async (patientData: any) => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `
        Generate a professional medical manuscript or case report based on the following patient data:
        ${JSON.stringify(patientData, null, 2)}
        
        The manuscript should include:
        1. Title
        2. Abstract
        3. Introduction
        4. Case Presentation
        5. Discussion
        6. Conclusion
        
        Format the response in Markdown.
      `,
      config: {
        systemInstruction: "You are an expert medical researcher and writer. You write high-quality, peer-reviewed level case reports. You strictly filter out non-clinical noise and focus on the medical significance of the case.",
      }
    });

    return response.text || "Failed to generate manuscript.";
  } catch (error) {
    console.error("Error generating manuscript:", error);
    throw new Error("Failed to generate manuscript.");
  }
};

export interface ClinicalReasoningResult {
  executiveSummary: string;
  criticalTriggers?: {
    trigger: string;
    action: string;
    priority: 'EMERGENT' | 'URGENT' | 'ROUTINE';
  }[];
  missingCriticalData?: string[];
  guidelines: string;
  managementSteps: string;
  clinicalReasoning: string;
  blindspots: string;
  complications: string;
  keyTrials: {
    name: string;
    year: string;
    summary: string;
  }[];
  references: {
    citation: string;
    url?: string;
  }[];
}

export const fetchClinicalReasoning = async (query: string, patientData?: PatientProfile): Promise<ClinicalReasoningResult> => {
  try {
    const patientContext = patientData ? `
    PATIENT CONTEXT:
    Name: ${patientData.name}
    Age: ${patientData.age || 'Unknown'}
    Gender: ${patientData.gender || 'Unknown'}
    MRN: ${patientData.mrn || 'Unknown'}
    
    LATEST CLINICAL STATE:
    ${JSON.stringify(patientData.history[0] || {}, null, 2)}
    
    PAST HISTORY SUMMARY:
    ${patientData.history.slice(1).map(h => h.historyNote).join('\n---\n')}
    ` : "No specific patient context provided. Provide a general but high-level evidence-based response.";

    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `
        You are an elite medical AI designed to outperform UpToDate, OpenEvidence, and Vera Health. You provide absolute latest, evidence-based clinical guidelines.
        
        CRITICAL: Your response must NOT be generic. It MUST be tailored to the SPECIFIC PATIENT provided in the context. If no patient is provided, assume a standard adult but maintain high complexity.
        
        QUERY: "${query}"
        
        ${patientContext}
        
        Your response MUST be structured as a JSON object with the following keys:
        1. "executiveSummary": A 2-3 sentence high-level summary for the physician. Focus on the core decision to be made.
        2. "criticalTriggers": An array of "Decision Triggers". Identify specific values or clinical changes in THIS PATIENT (or potential changes) that require immediate action (e.g., "If chest drain > 200ml/hr, return to OR").
        3. "missingCriticalData": Identify specific tests, physical exam findings, or history points that are MISSING from the current patient profile and are ESSENTIAL for an accurate diagnosis or safe management.
        4. "guidelines": A clear overview of the latest guidelines relevant to the topic and how they apply to THIS SPECIFIC PATIENT.
        5. "managementSteps": Step-by-step management instructions (including specific dosages, thresholds, and criteria calibrated for this patient's age/weight/renal function).
        6. "clinicalReasoning": Detailed evidence-based reasoning. Explain the "WHY" behind the recommendations, linking the patient's data to the guidelines.
        7. "blindspots": Analysis of common clinical pitfalls and cognitive biases (e.g., anchoring on the provisional diagnosis).
        8. "complications": Potential complications of the condition or the treatment itself.
        9. "keyTrials": An array of up to 3 landmark or recent clinical trials that shape this management.
        10. "references": An array of up to 5 specific references.
        
        INFORMATION ARCHITECTURE RULE:
        - The "clinicalReasoning" section can be detailed, but use markdown (bolding, lists, headers) to ensure it is readable.
        - The "executiveSummary" and "criticalTriggers" must be the most prominent information.
      `,
      config: {
        systemInstruction: "You are an expert, attending-level physician. You provide patient-specific, decision-driven clinical reasoning. You identify critical triggers for immediate action.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            criticalTriggers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trigger: { type: Type.STRING },
                  action: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['EMERGENT', 'URGENT', 'ROUTINE'] }
                },
                required: ["trigger", "action", "priority"]
              }
            },
            missingCriticalData: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            guidelines: { type: Type.STRING },
            managementSteps: { type: Type.STRING },
            clinicalReasoning: { type: Type.STRING },
            blindspots: { type: Type.STRING },
            complications: { type: Type.STRING },
            keyTrials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  year: { type: Type.STRING },
                  summary: { type: Type.STRING }
                },
                required: ["name", "year", "summary"]
              }
            },
            references: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  citation: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["citation"]
              }
            }
          },
          required: ["executiveSummary", "guidelines", "managementSteps", "clinicalReasoning", "blindspots", "complications", "keyTrials", "references"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(jsonStr);
  } catch (e: any) {
    console.error("Failed to fetch or parse Gemini reasoning response", e);
    
    if (e.message?.includes("SAFETY") || e.message?.includes("quota")) {
      throw e;
    }

    throw new Error(`Clinical reasoning failed: ${e.message || "Unknown error"}`);
  }
};

export const analyzeVitalsTrend = async (history: any[]): Promise<{ interpretation: string, prediction: string }> => {
  try {
    const vitalsData = history.map(h => ({
      time: new Date(h.timestamp).toLocaleString(),
      vitals: h.vitals
    }));

    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze the following patient vitals trend over time:
        ${JSON.stringify(vitalsData, null, 2)}
        
        Provide:
        1. A clinical interpretation of the trends (e.g., stabilizing, deteriorating, specific patterns like Cushing's reflex or shock index).
        2. A prediction of what might happen next based on these trends and what to watch out for.
      `,
      config: {
        systemInstruction: "You are an expert ICU physician analyzing vital sign trends.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interpretation: { type: Type.STRING },
            prediction: { type: Type.STRING }
          },
          required: ["interpretation", "prediction"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini vitals analysis", e);
    throw new Error("Failed to analyze vitals");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this clinical note clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }

  return `data:audio/wav;base64,${base64Audio}`;
};
