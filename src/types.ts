
export type PatientStatus = 'Alert' | 'Drowsy' | 'Obtunded' | 'Comatose';

export interface ClinicalLabs {
  // BMP / CMP
  glucose?: number;
  sodium?: number;
  potassium?: number;
  chloride?: number;
  bicarbonate?: number;
  bun?: number;
  creatinine?: number;
  calcium?: number;
  ast?: number;
  alt?: number;
  alp?: number;
  bilirubin?: number;
  albumin?: number;
  totalProtein?: number;
  
  // CBC
  wbc?: number;
  hgb?: number;
  hct?: number;
  plt?: number;
  
  // ABG / VBG
  ph?: number;
  pco2?: number;
  po2?: number;
  lactate?: number;
  
  // Cardiac / Coags / Other
  troponin?: string;
  bnp?: number;
  inr?: number;
  pt?: number;
  ptt?: number;
  crp?: number;
  esr?: number;
  ketones?: string;
  anionGap?: number;
  
  [key: string]: string | number | undefined;
}

export interface Vitals {
  bp_sys?: number;
  bp_dia?: number;
  hr?: number;
  rr?: number;
  temp?: number;
  spo2?: number;
}

export interface Differential {
  name: string;
  likelihood: 'High' | 'Moderate' | 'Low';
  reasoning: string;
}

export interface ManagementStep {
  action: string;
  guidelineSource: string;
  reasoning: string;
  drugInteractions?: string[];
  crclDoseAdjustment?: string;
  toxicityWarnings?: string[];
}

export interface AdversarialPoint {
  finding: string;
  contradicts: string;
  significance: string;
}

export interface ClinicalScores {
  anionGap?: number;
  crCl?: number;
  timi?: number;
  grace?: number;
  qsofa?: number;
  curb65?: number;
}

export interface TrajectoryPrediction {
  risks: { condition: string; probability: string }[];
  preventiveSteps: string[];
}

export interface Blindspot {
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface AgentDebate {
  guidelineAgent: string;
  safetyAgent: string;
  riskAgent: string;
  finalRecommendation: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: 'admission' | 'vital' | 'lab' | 'diagnosis' | 'treatment';
}

export interface WhatIfSimulation {
  scenario: string;
  predictedEffects: string[];
}

export interface ClinicalState {
  id: string;
  timestamp: number;
  labs: ClinicalLabs;
  vitals: Vitals;
  status: PatientStatus;
  weightKg: number;
  age?: number;
  gender?: 'Male' | 'Female';
  historyNote: string;
  
  // AI Generated / Calculated Fields
  scores: ClinicalScores;
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
  
  // New Features
  trajectory?: TrajectoryPrediction;
  blindspots?: Blindspot[];
  debate?: AgentDebate;
  timeline?: TimelineEvent[];
  whatIfs?: WhatIfSimulation[];
}

export interface PatientProfile {
  id: string;
  name: string;
  mrn?: string;
  age?: number;
  gender?: 'Male' | 'Female';
  history: ClinicalState[];
  isArchived: boolean;
  personalNotes?: string;
  createdAt?: number;
}

export interface Broadcast {
  id: string;
  userId: string;
  userEmail: string;
  patientName: string;
  summary: string;
  tags: string[];
  createdAt: number;
}

export interface DiscussionMessage {
  id: string;
  userId: string;
  userEmail: string;
  message: string;
  timestamp: number;
}
