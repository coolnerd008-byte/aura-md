import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Search, Info, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalculatorProps {
  initialLabs?: any;
  initialScores?: any;
  onCalculate?: (score: number, name: string) => void;
}

export const MedicalCalculators: React.FC<CalculatorProps> = ({ initialLabs, initialScores, onCalculate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalc, setSelectedCalc] = useState<string | null>(null);

  // Calculator States
  const [anionGap, setAnionGap] = useState<{ na: string; cl: string; hco3: string }>({
    na: initialLabs?.sodium || '',
    cl: initialLabs?.chloride || '',
    hco3: initialLabs?.bicarbonate || ''
  });

  const [crCl, setCrCl] = useState<{ age: string; weight: string; creat: string; gender: 'male' | 'female' }>({
    age: '',
    weight: initialLabs?.weightKg || '',
    creat: initialLabs?.creatinine || '',
    gender: 'male'
  });

  const [qSofa, setQSofa] = useState<{ rr: boolean; mentation: boolean; sbp: boolean }>({
    rr: false,
    mentation: false,
    sbp: false
  });

  const [bmi, setBmi] = useState<{ weight: string; height: string }>({
    weight: initialLabs?.weightKg || '',
    height: ''
  });

  const [correctedCa, setCorrectedCa] = useState<{ ca: string; alb: string }>({
    ca: initialLabs?.calcium || '',
    alb: initialLabs?.albumin || ''
  });

  useEffect(() => {
    if (initialLabs) {
      setAnionGap({
        na: initialLabs.sodium?.toString() || '',
        cl: initialLabs.chloride?.toString() || '',
        hco3: initialLabs.bicarbonate?.toString() || ''
      });
      setCrCl(prev => ({
        ...prev,
        weight: initialLabs.weightKg?.toString() || prev.weight,
        creat: initialLabs.creatinine?.toString() || ''
      }));
      setBmi(prev => ({
        ...prev,
        weight: initialLabs.weightKg?.toString() || prev.weight
      }));
      setCorrectedCa({
        ca: initialLabs.calcium?.toString() || '',
        alb: initialLabs.albumin?.toString() || ''
      });
    }
  }, [initialLabs]);

  useEffect(() => {
    if (initialScores) {
      if (initialScores.qsofa !== undefined) {
        // qsofa is a number (0-3), we need to map it back to booleans if possible, 
        // but usually it's better to just show the score.
        // For now, we'll just ensure the score is reflected if the calculator is open.
      }
    }
  }, [initialScores]);

  const [curb65, setCurb65] = useState<{ confusion: boolean; urea: boolean; rr: boolean; bp: boolean; age: boolean }>({
    confusion: false,
    urea: false,
    rr: false,
    bp: false,
    age: false
  });

  const [chadsVasc, setChadsVasc] = useState<{ 
    chf: boolean; htn: boolean; age75: boolean; dm: boolean; stroke: boolean; vascular: boolean; age65: boolean; female: boolean 
  }>({
    chf: false,
    htn: false,
    age75: false,
    dm: false,
    stroke: false,
    vascular: false,
    age65: false,
    female: false
  });

  const [wellsPE, setWellsPE] = useState<{
    signs: boolean; altDiag: boolean; hr: boolean; surgery: boolean; prevPE: boolean; hemoptysis: boolean; cancer: boolean;
  }>({
    signs: false,
    altDiag: false,
    hr: false,
    surgery: false,
    prevPE: false,
    hemoptysis: false,
    cancer: false
  });

  const [gcs, setGcs] = useState<{ eye: number; verbal: number; motor: number }>({
    eye: 4,
    verbal: 5,
    motor: 6
  });

  const [meld, setMeld] = useState<{ bilirubin: string; inr: string; creatinine: string; sodium: string; dialysis: boolean }>({
    bilirubin: initialLabs?.bilirubin || '',
    inr: initialLabs?.inr || '',
    creatinine: initialLabs?.creatinine || '',
    sodium: initialLabs?.sodium || '',
    dialysis: false
  });

  const [nihss, setNihss] = useState<number[]>(new Array(15).fill(0));
  
  const [heartScore, setHeartScore] = useState<{ history: number; ecg: number; age: number; risk: number; troponin: number }>({
    history: 0,
    ecg: 0,
    age: 0,
    risk: 0,
    troponin: 0
  });

  const [timiScore, setTimiScore] = useState<{
    age65: boolean; riskFactors: boolean; stenosis: boolean; stChanges: boolean; angina: boolean; asa: boolean; markers: boolean;
  }>({
    age65: false,
    riskFactors: false,
    stenosis: false,
    stChanges: false,
    angina: false,
    asa: false,
    markers: false
  });

  const [graceScore, setGraceScore] = useState<{
    age: string; hr: string; sbp: string; creat: string; killip: number; arrest: boolean; markers: boolean; stChanges: boolean;
  }>({
    age: '',
    hr: '',
    sbp: '',
    creat: initialLabs?.creatinine || '',
    killip: 1,
    arrest: false,
    markers: false,
    stChanges: false
  });

  const [hasBled, setHasBled] = useState<{
    htn: boolean; renal: boolean; liver: boolean; stroke: boolean; bleeding: boolean; inr: boolean; age: boolean; drugs: boolean; alcohol: boolean;
  }>({
    htn: false,
    renal: false,
    liver: false,
    stroke: false,
    bleeding: false,
    inr: false,
    age: false,
    drugs: false,
    alcohol: false
  });

  const [sirs, setSirs] = useState<{ temp: boolean; hr: boolean; rr: boolean; wbc: boolean }>({
    temp: false,
    hr: false,
    rr: false,
    wbc: false
  });

  // Auto-calculate if labs are provided
  useEffect(() => {
    if (initialLabs) {
      setAnionGap({
        na: initialLabs.sodium || '',
        cl: initialLabs.chloride || '',
        hco3: initialLabs.bicarbonate || ''
      });
      setCrCl(prev => ({
        ...prev,
        weight: initialLabs.weightKg || prev.weight,
        creat: initialLabs.creatinine || prev.creat
      }));
      setBmi(prev => ({
        ...prev,
        weight: initialLabs.weightKg || prev.weight
      }));
      setCorrectedCa({
        ca: initialLabs.calcium || '',
        alb: initialLabs.albumin || ''
      });
      setMeld(prev => ({
        ...prev,
        bilirubin: initialLabs.bilirubin || prev.bilirubin,
        inr: initialLabs.inr || prev.inr,
        creatinine: initialLabs.creatinine || prev.creatinine,
        sodium: initialLabs.sodium || prev.sodium
      }));
      
      // Auto-set flags based on labs if possible
      if (initialLabs.bun > 19) setCurb65(prev => ({ ...prev, urea: true }));
      if (initialLabs.creatinine > 1.2) setCrCl(prev => ({ ...prev, creat: initialLabs.creatinine }));
      if (initialLabs.wbc > 12 || initialLabs.wbc < 4) setSirs(prev => ({ ...prev, wbc: true }));
      if (initialLabs.temp > 38 || initialLabs.temp < 36) setSirs(prev => ({ ...prev, temp: true }));
      if (initialLabs.hr > 90) setSirs(prev => ({ ...prev, hr: true }));
      if (initialLabs.rr > 20) setSirs(prev => ({ ...prev, rr: true }));
    }
  }, [initialLabs]);

  const calculators = [
    { id: 'anion-gap', name: 'Anion Gap', category: 'Metabolic', description: 'Calculates the difference between measured cations and anions.' },
    { id: 'crcl', name: 'CrCl (Cockcroft-Gault)', category: 'Renal', description: 'Estimates creatinine clearance for drug dosing.' },
    { id: 'qsofa', name: 'qSOFA Score', category: 'Critical Care', description: 'Quick Sequential Organ Failure Assessment for sepsis risk.' },
    { id: 'bmi', name: 'BMI Calculator', category: 'General', description: 'Body Mass Index calculation.' },
    { id: 'corrected-ca', name: 'Corrected Calcium', category: 'Metabolic', description: 'Adjusts calcium for albumin levels.' },
    { id: 'curb65', name: 'CURB-65', category: 'Pulmonary', description: 'Pneumonia severity score.' },
    { id: 'chads-vasc', name: 'CHA₂DS₂-VASc', category: 'Cardiology', description: 'Stroke risk in atrial fibrillation.' },
    { id: 'wells-pe', name: "Wells' Criteria (PE)", category: 'Pulmonary', description: 'Clinical probability of pulmonary embolism.' },
    { id: 'gcs', name: 'Glasgow Coma Scale', category: 'Neurology', description: 'Neurological assessment of consciousness.' },
    { id: 'meld', name: 'MELD Score', category: 'Gastroenterology', description: 'End-stage liver disease severity.' },
    { id: 'nihss', name: 'NIH Stroke Scale', category: 'Neurology', description: 'Standardized stroke severity assessment.' },
    { id: 'has-bled', name: 'HAS-BLED Score', category: 'Cardiology', description: 'Major bleeding risk in AF patients.' },
    { id: 'sirs', name: 'SIRS Criteria', category: 'Critical Care', description: 'Systemic Inflammatory Response Syndrome.' },
    { id: 'heart-score', name: 'HEART Score', category: 'Cardiology', description: 'Predicts 6-week risk of major adverse cardiac events.' },
    { id: 'timi-score', name: 'TIMI Risk Score', category: 'Cardiology', description: 'Risk of death and ischemic events in UA/NSTEMI.' },
    { id: 'grace-score', name: 'GRACE Score', category: 'Cardiology', description: 'Predicts in-hospital and 6-month mortality in ACS.' }
  ];

  const filteredCalculators = calculators.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculations
  const calculateAnionGap = () => {
    const na = parseFloat(anionGap.na);
    const cl = parseFloat(anionGap.cl);
    const hco3 = parseFloat(anionGap.hco3);
    if (isNaN(na) || isNaN(cl) || isNaN(hco3)) return null;
    return na - (cl + hco3);
  };

  const calculateCrCl = () => {
    const age = parseFloat(crCl.age);
    const weight = parseFloat(crCl.weight);
    const creat = parseFloat(crCl.creat);
    if (isNaN(age) || isNaN(weight) || isNaN(creat) || creat === 0) return null;
    let result = ((140 - age) * weight) / (72 * creat);
    if (crCl.gender === 'female') result *= 0.85;
    return result;
  };

  const calculateQSofa = () => {
    let score = 0;
    if (qSofa.rr) score++;
    if (qSofa.mentation) score++;
    if (qSofa.sbp) score++;
    return score;
  };

  const calculateBMI = () => {
    const w = parseFloat(bmi.weight);
    const h = parseFloat(bmi.height);
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return w / ((h / 100) ** 2);
  };

  const calculateCorrectedCa = () => {
    const ca = parseFloat(correctedCa.ca);
    const alb = parseFloat(correctedCa.alb);
    if (isNaN(ca) || isNaN(alb)) return null;
    return ca + 0.8 * (4.0 - alb);
  };

  const calculateCurb65 = () => {
    let score = 0;
    if (curb65.confusion) score++;
    if (curb65.urea) score++;
    if (curb65.rr) score++;
    if (curb65.bp) score++;
    if (curb65.age) score++;
    return score;
  };

  const calculateChadsVasc = () => {
    let score = 0;
    if (chadsVasc.chf) score++;
    if (chadsVasc.htn) score++;
    if (chadsVasc.age75) score += 2;
    if (chadsVasc.dm) score++;
    if (chadsVasc.stroke) score += 2;
    if (chadsVasc.vascular) score++;
    if (chadsVasc.age65) score++;
    if (chadsVasc.female) score++;
    return score;
  };

  const calculateWellsPE = () => {
    let score = 0;
    if (wellsPE.signs) score += 3;
    if (wellsPE.altDiag) score += 3;
    if (wellsPE.hr) score += 1.5;
    if (wellsPE.surgery) score += 1.5;
    if (wellsPE.prevPE) score += 1.5;
    if (wellsPE.hemoptysis) score += 1;
    if (wellsPE.cancer) score += 1;
    return score;
  };

  const calculateGCS = () => gcs.eye + gcs.verbal + gcs.motor;

  const calculateMELD = () => {
    const bili = parseFloat(meld.bilirubin);
    const inr = parseFloat(meld.inr);
    const creat = parseFloat(meld.creatinine);
    const na = parseFloat(meld.sodium);
    if (isNaN(bili) || isNaN(inr) || isNaN(creat) || isNaN(na)) return null;
    
    let meldScore = (0.957 * Math.log(creat || 1)) + (0.378 * Math.log(bili || 1)) + (1.120 * Math.log(inr || 1)) + 0.643;
    meldScore = Math.round(meldScore * 10);
    
    // MELD-Na adjustment
    if (meldScore > 11) {
      meldScore = meldScore + 1.32 * (137 - na) - (0.033 * meldScore * (137 - na));
    }
    return Math.min(40, Math.max(6, Math.round(meldScore)));
  };

  const calculateNIHSS = () => nihss.reduce((a, b) => a + b, 0);

  const calculateHasBled = () => {
    let score = 0;
    Object.values(hasBled).forEach(v => { if (v) score++; });
    return score;
  };

  const calculateSirs = () => {
    let score = 0;
    Object.values(sirs).forEach(v => { if (v) score++; });
    return score;
  };

  const calculateHEART = () => {
    return heartScore.history + heartScore.ecg + heartScore.age + heartScore.risk + heartScore.troponin;
  };

  const calculateTIMI = () => {
    return Object.values(timiScore).filter(v => v).length;
  };

  const calculateGRACE = () => {
    const age = parseFloat(graceScore.age);
    const hr = parseFloat(graceScore.hr);
    const sbp = parseFloat(graceScore.sbp);
    const creat = parseFloat(graceScore.creat);
    if (isNaN(age) || isNaN(hr) || isNaN(sbp) || isNaN(creat)) return null;
    
    // Simplified GRACE calculation logic for demonstration
    let score = 0;
    if (age >= 80) score += 100; else if (age >= 70) score += 75; else if (age >= 60) score += 58; else if (age >= 50) score += 41; else if (age >= 40) score += 25;
    if (hr >= 200) score += 46; else if (hr >= 150) score += 32; else if (hr >= 110) score += 23; else if (hr >= 90) score += 14; else if (hr >= 70) score += 8;
    if (sbp < 80) score += 58; else if (sbp < 100) score += 53; else if (sbp < 120) score += 43; else if (sbp < 140) score += 34; else if (sbp < 160) score += 24;
    if (creat >= 4) score += 28; else if (creat >= 2) score += 15; else if (creat >= 1.6) score += 11; else if (creat >= 1.2) score += 7; else if (creat >= 0.8) score += 4;
    
    score += (graceScore.killip - 1) * 20;
    if (graceScore.arrest) score += 39;
    if (graceScore.markers) score += 14;
    if (graceScore.stChanges) score += 28;
    
    return score;
  };

  return (
    <div className="flex flex-col h-full bg-[#121417]">
      <div className="p-6 border-b border-[#2c3137]">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-8 h-8 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-white turquoise-text-glow">Medical Calculators</h2>
            <p className="text-sm text-[#a1aab5]">Evidence-based clinical scores and calculations.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a4149]" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calculators (e.g., Sepsis, Renal, BMI)..."
            className="w-full bg-[#1e2226] border border-[#2c3137] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {initialScores && Object.keys(initialScores).length > 0 && (
          <div className="mb-8 p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI-Extracted Scores</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(initialScores).map(([key, value]) => (
                value !== undefined && value !== null && (
                  <div key={key} className="bg-[#1e2226] p-3 rounded-xl border border-[#2c3137]">
                    <div className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-tighter mb-1 truncate">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {typeof value === 'number' ? value.toFixed(1) : String(value)}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCalculators.map((calc) => (
            <motion.div
              key={calc.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedCalc(calc.id)}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer group",
                selectedCalc === calc.id 
                  ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10" 
                  : "bg-[#1e2226] border-[#2c3137] hover:border-[#3a4149]"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md">
                  {calc.category}
                </span>
                <ChevronRight className={cn("w-4 h-4 text-[#3a4149] group-hover:text-white transition-colors", selectedCalc === calc.id && "text-white")} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{calc.name}</h3>
              <p className="text-xs text-[#a1aab5] leading-relaxed">{calc.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Calculator Details/Inputs */}
        <AnimatePresence mode="wait">
          {selectedCalc && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 p-8 bg-[#1e2226] border border-[#2c3137] rounded-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white">
                  {calculators.find(c => c.id === selectedCalc)?.name}
                </h3>
                <button 
                  onClick={() => setSelectedCalc(null)}
                  className="text-xs font-bold text-[#a1aab5] hover:text-white uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              {selectedCalc === 'anion-gap' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Sodium (Na+)</label>
                      <input 
                        type="number"
                        value={anionGap.na}
                        onChange={(e) => setAnionGap({...anionGap, na: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        placeholder="mEq/L"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Chloride (Cl-)</label>
                      <input 
                        type="number"
                        value={anionGap.cl}
                        onChange={(e) => setAnionGap({...anionGap, cl: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        placeholder="mEq/L"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Bicarbonate (HCO3-)</label>
                      <input 
                        type="number"
                        value={anionGap.hco3}
                        onChange={(e) => setAnionGap({...anionGap, hco3: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        placeholder="mEq/L"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Calculated Anion Gap</span>
                    <span className="text-5xl font-bold text-cyan-400 turquoise-text-glow">
                      {calculateAnionGap() !== null ? calculateAnionGap()?.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs text-[#a1aab5] mt-4">Normal range: 8-12 mEq/L</span>
                  </div>
                </div>
              )}

              {selectedCalc === 'qsofa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { id: 'rr', label: 'Respiratory Rate ≥ 22/min', state: qSofa.rr },
                      { id: 'sbp', label: 'Systolic BP ≤ 100 mmHg', state: qSofa.sbp },
                      { id: 'mentation', label: 'Altered Mentation (GCS < 15)', state: qSofa.mentation }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setQSofa({...qSofa, [item.id]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-5 h-5 text-cyan-400" /> : <div className="w-5 h-5 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">qSOFA Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateQSofa() >= 2 ? "text-red-400" : "text-cyan-400"
                    )}>
                      {calculateQSofa()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateQSofa() >= 2 
                        ? "High risk of poor outcome. Consider sepsis." 
                        : "Low risk of poor outcome."}
                    </p>
                  </div>
                </div>
              )}

              {/* Add other calculators similarly... */}
              {selectedCalc === 'crcl' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Age</label>
                      <input 
                        type="number"
                        value={crCl.age}
                        onChange={(e) => setCrCl({...crCl, age: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Weight (kg)</label>
                      <input 
                        type="number"
                        value={crCl.weight}
                        onChange={(e) => setCrCl({...crCl, weight: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Serum Creatinine (mg/dL)</label>
                      <input 
                        type="number"
                        value={crCl.creat}
                        onChange={(e) => setCrCl({...crCl, creat: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setCrCl({...crCl, gender: 'male'})}
                        className={cn("flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all", crCl.gender === 'male' ? "bg-cyan-500 border-cyan-500 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]")}
                      >
                        Male
                      </button>
                      <button 
                        onClick={() => setCrCl({...crCl, gender: 'female'})}
                        className={cn("flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all", crCl.gender === 'female' ? "bg-cyan-500 border-cyan-500 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]")}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Estimated CrCl</span>
                    <span className="text-5xl font-bold text-cyan-400 turquoise-text-glow">
                      {calculateCrCl() !== null ? calculateCrCl()?.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs text-[#a1aab5] mt-4">mL/min</span>
                  </div>
                </div>
              )}

              {selectedCalc === 'bmi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Weight (kg)</label>
                      <input 
                        type="number"
                        value={bmi.weight}
                        onChange={(e) => setBmi({...bmi, weight: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Height (cm)</label>
                      <input 
                        type="number"
                        value={bmi.height}
                        onChange={(e) => setBmi({...bmi, height: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Calculated BMI</span>
                    <span className="text-5xl font-bold text-cyan-400 turquoise-text-glow">
                      {calculateBMI() !== null ? calculateBMI()?.toFixed(1) : '--'}
                    </span>
                    <p className="text-xs text-[#a1aab5] mt-4">
                      {calculateBMI() !== null && (
                        calculateBMI()! < 18.5 ? "Underweight" :
                        calculateBMI()! < 25 ? "Normal" :
                        calculateBMI()! < 30 ? "Overweight" : "Obese"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'curb65' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { id: 'confusion', label: 'Confusion (newly onset)', state: curb65.confusion },
                      { id: 'urea', label: 'BUN > 19 mg/dL (7 mmol/L)', state: curb65.urea },
                      { id: 'rr', label: 'Respiratory Rate ≥ 30/min', state: curb65.rr },
                      { id: 'bp', label: 'SBP < 90 or DBP ≤ 60 mmHg', state: curb65.bp },
                      { id: 'age', label: 'Age ≥ 65 years', state: curb65.age }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setCurb65({...curb65, [item.id as keyof typeof curb65]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-5 h-5 text-cyan-400" /> : <div className="w-5 h-5 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">CURB-65 Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateCurb65() >= 3 ? "text-red-400" : calculateCurb65() >= 2 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateCurb65()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateCurb65() >= 3 ? "High risk. Consider ICU." : calculateCurb65() >= 2 ? "Moderate risk. Consider admission." : "Low risk. Outpatient care."}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'chads-vasc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    {[
                      { id: 'chf', label: 'CHF or LVEF ≤ 40%', state: chadsVasc.chf },
                      { id: 'htn', label: 'Hypertension', state: chadsVasc.htn },
                      { id: 'age75', label: 'Age ≥ 75 years (+2)', state: chadsVasc.age75 },
                      { id: 'dm', label: 'Diabetes Mellitus', state: chadsVasc.dm },
                      { id: 'stroke', label: 'Stroke/TIA/Thromboembolism (+2)', state: chadsVasc.stroke },
                      { id: 'vascular', label: 'Vascular Disease (MI, PAD, aortic plaque)', state: chadsVasc.vascular },
                      { id: 'age65', label: 'Age 65-74 years', state: chadsVasc.age65 },
                      { id: 'female', label: 'Female Sex', state: chadsVasc.female }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setChadsVasc({...chadsVasc, [item.id as keyof typeof chadsVasc]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-xs font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <div className="w-4 h-4 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">CHA₂DS₂-VASc Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateChadsVasc() >= 2 ? "text-red-400" : "text-cyan-400"
                    )}>
                      {calculateChadsVasc()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateChadsVasc() >= 2 ? "Anticoagulation recommended." : calculateChadsVasc() === 1 ? "Consider anticoagulation." : "No anticoagulation needed."}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'corrected-ca' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Serum Calcium (mg/dL)</label>
                      <input 
                        type="number"
                        value={correctedCa.ca}
                        onChange={(e) => setCorrectedCa({...correctedCa, ca: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Serum Albumin (g/dL)</label>
                      <input 
                        type="number"
                        value={correctedCa.alb}
                        onChange={(e) => setCorrectedCa({...correctedCa, alb: e.target.value})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Corrected Calcium</span>
                    <span className="text-5xl font-bold text-cyan-400 turquoise-text-glow">
                      {calculateCorrectedCa() !== null ? calculateCorrectedCa()?.toFixed(2) : '--'}
                    </span>
                    <span className="text-xs text-[#a1aab5] mt-4">mg/dL</span>
                  </div>
                </div>
              )}

              {selectedCalc === 'wells-pe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    {[
                      { id: 'signs', label: 'Clinical signs/symptoms of DVT (+3)', state: wellsPE.signs },
                      { id: 'altDiag', label: 'PE is #1 diagnosis or equally likely (+3)', state: wellsPE.altDiag },
                      { id: 'hr', label: 'Heart rate > 100 bpm (+1.5)', state: wellsPE.hr },
                      { id: 'surgery', label: 'Immobilization/surgery in past 4 weeks (+1.5)', state: wellsPE.surgery },
                      { id: 'prevPE', label: 'Previous PE or DVT (+1.5)', state: wellsPE.prevPE },
                      { id: 'hemoptysis', label: 'Hemoptysis (+1)', state: wellsPE.hemoptysis },
                      { id: 'cancer', label: 'Malignancy with active treatment (+1)', state: wellsPE.cancer }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setWellsPE({...wellsPE, [item.id as keyof typeof wellsPE]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-xs font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <div className="w-4 h-4 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Wells' PE Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateWellsPE() > 4 ? "text-red-400" : calculateWellsPE() >= 2 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateWellsPE()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateWellsPE() > 4 ? "High probability (37.5%)" : calculateWellsPE() >= 2 ? "Moderate probability (16.2%)" : "Low probability (1.3%)"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'gcs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Eye Opening (1-4)</label>
                      <select 
                        value={gcs.eye}
                        onChange={(e) => setGcs({...gcs, eye: parseInt(e.target.value)})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={4}>4 - Spontaneous</option>
                        <option value={3}>3 - To speech</option>
                        <option value={2}>2 - To pain</option>
                        <option value={1}>1 - None</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Verbal Response (1-5)</label>
                      <select 
                        value={gcs.verbal}
                        onChange={(e) => setGcs({...gcs, verbal: parseInt(e.target.value)})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={5}>5 - Oriented</option>
                        <option value={4}>4 - Confused</option>
                        <option value={3}>3 - Inappropriate words</option>
                        <option value={2}>2 - Incomprehensible sounds</option>
                        <option value={1}>1 - None</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Motor Response (1-6)</label>
                      <select 
                        value={gcs.motor}
                        onChange={(e) => setGcs({...gcs, motor: parseInt(e.target.value)})}
                        className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={6}>6 - Obeys commands</option>
                        <option value={5}>5 - Localizes pain</option>
                        <option value={4}>4 - Withdraws from pain</option>
                        <option value={3}>3 - Flexion to pain (decorticate)</option>
                        <option value={2}>2 - Extension to pain (decerebrate)</option>
                        <option value={1}>1 - None</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Total GCS Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateGCS() <= 8 ? "text-red-400" : "text-cyan-400"
                    )}>
                      {calculateGCS()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateGCS() <= 8 ? "Severe brain injury (Coma)" : calculateGCS() <= 12 ? "Moderate brain injury" : "Mild brain injury"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'meld' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Bilirubin (mg/dL)</label>
                        <input type="number" value={meld.bilirubin} onChange={(e) => setMeld({...meld, bilirubin: e.target.value})} className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">INR</label>
                        <input type="number" value={meld.inr} onChange={(e) => setMeld({...meld, inr: e.target.value})} className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Creatinine (mg/dL)</label>
                        <input type="number" value={meld.creatinine} onChange={(e) => setMeld({...meld, creatinine: e.target.value})} className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Sodium (mEq/L)</label>
                        <input type="number" value={meld.sodium} onChange={(e) => setMeld({...meld, sodium: e.target.value})} className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" />
                      </div>
                    </div>
                    <button 
                      onClick={() => setMeld({...meld, dialysis: !meld.dialysis})}
                      className={cn("w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all", meld.dialysis ? "bg-cyan-500 border-cyan-500 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]")}
                    >
                      Dialysis ≥ 2x in past week
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">MELD-Na Score</span>
                    <span className="text-5xl font-bold text-cyan-400 turquoise-text-glow">
                      {calculateMELD() !== null ? calculateMELD() : '--'}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      Estimated 3-month mortality: {calculateMELD()! > 40 ? ">71%" : calculateMELD()! > 30 ? "52.6%" : calculateMELD()! > 20 ? "19.6%" : "1.9%"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'sirs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { id: 'temp', label: 'Temp > 38°C or < 36°C', state: sirs.temp },
                      { id: 'hr', label: 'Heart Rate > 90 bpm', state: sirs.hr },
                      { id: 'rr', label: 'RR > 20 or PaCO2 < 32 mmHg', state: sirs.rr },
                      { id: 'wbc', label: 'WBC > 12k, < 4k, or > 10% bands', state: sirs.wbc }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSirs({...sirs, [item.id as keyof typeof sirs]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-5 h-5 text-cyan-400" /> : <div className="w-5 h-5 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">SIRS Criteria Met</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateSirs() >= 2 ? "text-red-400" : "text-cyan-400"
                    )}>
                      {calculateSirs()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateSirs() >= 2 ? "SIRS criteria met. Evaluate for infection/sepsis." : "SIRS criteria not met."}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'heart-score' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {[
                      { key: 'history', label: 'History', options: ['Slightly suspicious (0)', 'Moderately suspicious (1)', 'Highly suspicious (2)'] },
                      { key: 'ecg', label: 'ECG', options: ['Normal (0)', 'Non-specific repolarization (1)', 'Significant ST depression (2)'] },
                      { key: 'age', label: 'Age', options: ['<45 (0)', '45-64 (1)', '≥65 (2)'] },
                      { key: 'risk', label: 'Risk Factors', options: ['No known risk factors (0)', '1-2 risk factors (1)', '≥3 risk factors or history of atherosclerosis (2)'] },
                      { key: 'troponin', label: 'Troponin', options: ['≤ULN (0)', '1-3x ULN (1)', '>3x ULN (2)'] }
                    ].map((item) => (
                      <div key={item.key} className="space-y-2">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">{item.label}</label>
                        <div className="grid grid-cols-1 gap-2">
                          {item.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => setHeartScore(prev => ({ ...prev, [item.key]: idx }))}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-medium border transition-all text-left",
                                (heartScore as any)[item.key] === idx 
                                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                                  : "bg-[#121417] border-[#2c3137] text-[#a1aab5] hover:border-[#3a4149]"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-6 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">HEART Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateHEART() >= 7 ? "text-red-400" : calculateHEART() >= 4 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateHEART()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4">
                      {calculateHEART() >= 7 ? "High Risk: 50-65% MACE" : calculateHEART() >= 4 ? "Moderate Risk: 12-17% MACE" : "Low Risk: <2% MACE"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'timi-score' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { key: 'age65', label: 'Age ≥ 65' },
                      { key: 'riskFactors', label: '≥ 3 Risk Factors for CAD' },
                      { key: 'stenosis', label: 'Known Coronary Stenosis ≥ 50%' },
                      { key: 'stChanges', label: 'ST-segment deviation on ECG' },
                      { key: 'angina', label: '≥ 2 Anginal episodes in past 24h' },
                      { key: 'asa', label: 'Aspirin use in past 7 days' },
                      { key: 'markers', label: 'Elevated Cardiac Biomarkers' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setTimiScore(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-between",
                          (timiScore as any)[item.key] 
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                            : "bg-[#121417] border-[#2c3137] text-[#a1aab5] hover:border-[#3a4149]"
                        )}
                      >
                        {item.label}
                        {(timiScore as any)[item.key] ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-6 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">TIMI Risk Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateTIMI() >= 5 ? "text-red-400" : calculateTIMI() >= 3 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateTIMI()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4">
                      {calculateTIMI() >= 5 ? "High Risk: 26-41% 14-day risk" : calculateTIMI() >= 3 ? "Intermediate Risk: 13-20% 14-day risk" : "Low Risk: 5-8% 14-day risk"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'grace-score' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Age</label>
                        <input 
                          type="number" 
                          value={graceScore.age}
                          onChange={(e) => setGraceScore(prev => ({ ...prev, age: e.target.value }))}
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Heart Rate</label>
                        <input 
                          type="number" 
                          value={graceScore.hr}
                          onChange={(e) => setGraceScore(prev => ({ ...prev, hr: e.target.value }))}
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Systolic BP</label>
                        <input 
                          type="number" 
                          value={graceScore.sbp}
                          onChange={(e) => setGraceScore(prev => ({ ...prev, sbp: e.target.value }))}
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Creatinine</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={graceScore.creat}
                          onChange={(e) => setGraceScore(prev => ({ ...prev, creat: e.target.value }))}
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Killip Class</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((v) => (
                          <button
                            key={v}
                            onClick={() => setGraceScore(prev => ({ ...prev, killip: v }))}
                            className={cn(
                              "px-2 py-2 rounded-lg text-[10px] font-medium border transition-all",
                              graceScore.killip === v 
                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                                : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                            )}
                          >
                            Class {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'arrest', label: 'Cardiac Arrest at Admission' },
                        { key: 'markers', label: 'Elevated Cardiac Markers' },
                        { key: 'stChanges', label: 'ST-segment Deviation' }
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setGraceScore(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                          className={cn(
                            "w-full px-4 py-2 rounded-xl text-[10px] font-medium border transition-all flex items-center justify-between",
                            (graceScore as any)[item.key] 
                              ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                              : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                          )}
                        >
                          {item.label}
                          {(graceScore as any)[item.key] ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-[#2c3137]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-6 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">GRACE Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      (calculateGRACE() || 0) >= 140 ? "text-red-400" : (calculateGRACE() || 0) >= 109 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateGRACE() || '--'}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4">
                      {(calculateGRACE() || 0) >= 140 ? "High Risk: >3% In-hospital mortality" : (calculateGRACE() || 0) >= 109 ? "Intermediate Risk: 1-3% mortality" : "Low Risk: <1% mortality"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'has-bled' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    {[
                      { id: 'htn', label: 'Hypertension (SBP > 160)', state: hasBled.htn },
                      { id: 'renal', label: 'Abnormal Renal Function', state: hasBled.renal },
                      { id: 'liver', label: 'Abnormal Liver Function', state: hasBled.liver },
                      { id: 'stroke', label: 'Stroke History', state: hasBled.stroke },
                      { id: 'bleeding', label: 'Prior Bleeding or Predisposition', state: hasBled.bleeding },
                      { id: 'inr', label: 'Labile INR', state: hasBled.inr },
                      { id: 'age', label: 'Age > 65 years', state: hasBled.age },
                      { id: 'drugs', label: 'Antiplatelet drugs/NSAIDs', state: hasBled.drugs },
                      { id: 'alcohol', label: 'Alcohol use (≥ 8 drinks/week)', state: hasBled.alcohol }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setHasBled({...hasBled, [item.id as keyof typeof hasBled]: !item.state})}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl border transition-all",
                          item.state ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-[#121417] border-[#2c3137] text-[#a1aab5]"
                        )}
                      >
                        <span className="text-xs font-medium">{item.label}</span>
                        {item.state ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <div className="w-4 h-4 rounded-full border-2 border-[#2c3137]" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-8 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">HAS-BLED Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateHasBled() >= 3 ? "text-red-400" : "text-cyan-400"
                    )}>
                      {calculateHasBled()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4 px-4">
                      {calculateHasBled() >= 3 ? "High risk of major bleeding. Caution with anticoagulation." : "Low to moderate risk."}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc === 'nihss' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      "1a. Level of Consciousness", "1b. LOC Questions", "1c. LOC Commands",
                      "2. Best Gaze", "3. Visual Fields", "4. Facial Palsy",
                      "5a. Left Arm Motor", "5b. Right Arm Motor", "6a. Left Leg Motor", "6b. Right Leg Motor",
                      "7. Limb Ataxia", "8. Sensory", "9. Best Language", "10. Dysarthria", "11. Extinction/Inattention"
                    ].map((label, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest">{label}</label>
                        <select 
                          value={nihss[idx]}
                          onChange={(e) => {
                            const next = [...nihss];
                            next[idx] = parseInt(e.target.value);
                            setNihss(next);
                          }}
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {[0, 1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#121417] rounded-2xl p-6 border border-[#2c3137]">
                    <span className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest mb-2">Total NIHSS Score</span>
                    <span className={cn(
                      "text-5xl font-bold turquoise-text-glow",
                      calculateNIHSS() >= 21 ? "text-red-400" : calculateNIHSS() >= 16 ? "text-amber-400" : "text-cyan-400"
                    )}>
                      {calculateNIHSS()}
                    </span>
                    <p className="text-xs text-center text-[#a1aab5] mt-4">
                      {calculateNIHSS() >= 21 ? "Severe Stroke" : calculateNIHSS() >= 16 ? "Moderate-Severe Stroke" : calculateNIHSS() >= 5 ? "Moderate Stroke" : "Mild Stroke"}
                    </p>
                  </div>
                </div>
              )}

              {selectedCalc !== 'anion-gap' && selectedCalc !== 'qsofa' && selectedCalc !== 'crcl' && selectedCalc !== 'bmi' && selectedCalc !== 'curb65' && selectedCalc !== 'chads-vasc' && selectedCalc !== 'corrected-ca' && selectedCalc !== 'wells-pe' && selectedCalc !== 'gcs' && selectedCalc !== 'meld' && selectedCalc !== 'nihss' && selectedCalc !== 'has-bled' && selectedCalc !== 'sirs' && selectedCalc !== 'heart-score' && selectedCalc !== 'timi-score' && selectedCalc !== 'grace-score' && (
                <div className="flex flex-col items-center justify-center py-12 text-[#3a4149]">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p className="text-sm">Calculator interface for {selectedCalc} is under development.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MedicalCalculators;
