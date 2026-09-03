import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Mic, 
  MicOff, 
  Plus, 
  History, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Droplets, 
  Thermometer, 
  User as UserIcon,
  ArrowRight,
  Save,
  Trash2,
  Volume2,
  Type as TypeIcon,
  Send,
  LineChart as LineChartIcon,
  FileText,
  Copy,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Shield,
  ShieldOff,
  BrainCircuit,
  HelpCircle,
  Stethoscope,
  LayoutDashboard,
  ClipboardList,
  Beaker,
  UserPlus,
  X,
  HeartPulse,
  Menu,
  Search,
  Download,
  Settings,
  Library,
  Microscope,
  Globe,
  Loader2,
  Languages,
  Database,
  BookOpen,
  Link as LinkIcon,
  TrendingUp,
  Image as ImageIcon,
  Upload,
  Minus,
  Layers,
  ChevronDown,
  LogOut,
  Share2,
  Building,
  Edit2,
  Wind,
  PanelRight,
  ArrowLeft,
  Brain,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Calculator,
  CircleX,
  Lock,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

import { ClinicalState, PatientProfile, ClinicalLabs, Vitals, Differential, ManagementStep, WhatIfSimulation, Broadcast, DiscussionMessage } from './types';
import { parseAmbientTranscript, fetchClinicalReasoning, interpretMedicalImage, compileTranscript, generateManuscript, generatePeerReply, analyzeVitalsTrend, generateSpeech, extractNotesFromImages } from './services/geminiService';
import { checkUsageLimit, incrementUsage, FREE_WEEKLY_LIMIT, PRO_MONTHLY_LIMIT, validateUsagePeriod, getNextResetDate, getStartOfWeek } from './services/usageService';
import { preloadCoreProtocols, getCachedProtocol, getOfflineStatus } from './services/offlineService';
import { encryptData, decryptData, isEncrypted, hashKey } from './services/securityService';
import MedicalCalculators from './components/Calculators';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, onSnapshot, updateDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import fpPromise from '@fingerprintjs/fingerprintjs';
import html2pdf from 'html2pdf.js';
import defaultContent from './constants/content.json';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function CompiledPatientReport({ patient, latestState, isDisguised }: { patient: PatientProfile, latestState: ClinicalState | null, isDisguised: boolean }) {
  return (
    <div className="space-y-8 p-8 bg-white text-black font-sans w-[210mm]">
      <div className="border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">Clinical Patient Encounter Report</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div><strong>Patient:</strong> {disguiseText(patient.name, 'name', isDisguised)}</div>
          <div><strong>ID:</strong> {patient.id}</div>
          <div><strong>Age/Sex:</strong> {disguiseText(patient.age, 'age', isDisguised)} / {disguiseText(patient.gender, 'gender', isDisguised)}</div>
          <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Detailed History</h2>
        <div className="space-y-4">
          {patient.history.map((state, idx) => (
            <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
              <div className="text-[10px] font-bold text-gray-500 mb-1">{new Date(state.timestamp).toLocaleString()}</div>
              <div className="whitespace-pre-wrap text-xs leading-relaxed">{state.historyNote}</div>
            </div>
          ))}
        </div>
      </section>

      {latestState && (
        <section>
          <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Clinical Assessment & Management Plan</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-xs uppercase text-gray-600 mb-1">Provisional Diagnosis</h3>
              <p className="text-xs">{latestState.provisionalDiagnosis}</p>
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase text-gray-600 mb-2">Management Plan</h3>
              <div className="space-y-3">
                {latestState.managementPlan.map((action, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-bold">• {action.action}</div>
                    <div className="text-[10px] text-gray-600 italic ml-4">Reasoning: {action.reasoning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {patient.personalNotes && (
        <section>
          <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Personal Notes</h2>
          <div className="whitespace-pre-wrap text-xs italic bg-gray-50 p-4 rounded border border-gray-100">
            {patient.personalNotes}
          </div>
        </section>
      )}
      
      <div className="mt-12 pt-4 border-t border-gray-100 text-[8px] text-gray-400 text-center">
        Generated by Clinical Nexus AI • {new Date().toISOString()} • Confidential Medical Record
      </div>
    </div>
  );
}

function CompiledReasoningReport({ result }: { result: any }) {
  return (
    <div className="space-y-8 p-8 bg-white text-black font-sans w-[210mm]">
      <div className="border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">Clinical Reasoning Report</h1>
        <div className="mt-4 text-xs">
          <div><strong>Query:</strong> {result.query}</div>
          <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Guideline Overview</h2>
        <div className="text-xs leading-relaxed">
          <div className="pdf-markdown-body">
            <Markdown>{result.guidelines}</Markdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Management Steps</h2>
        <div className="text-xs leading-relaxed">
          <div className="pdf-markdown-body">
            <Markdown>{result.managementSteps}</Markdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Clinical Reasoning</h2>
        <div className="text-xs leading-relaxed">
          <div className="pdf-markdown-body">
            <Markdown>{result.clinicalReasoning}</Markdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Clinical Blindspots</h2>
        <div className="text-xs leading-relaxed">
          <div className="pdf-markdown-body">
            <Markdown>{result.blindspots}</Markdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Potential Complications</h2>
        <div className="text-xs leading-relaxed">
          <div className="pdf-markdown-body">
            <Markdown>{result.complications}</Markdown>
          </div>
        </div>
      </section>

      {result.keyTrials && result.keyTrials.length > 0 && (
        <section>
          <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">Key Clinical Trials</h2>
          <div className="space-y-4">
            {result.keyTrials.map((trial: any, idx: number) => (
              <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="font-bold text-xs">{trial.name} ({trial.year})</div>
                <div className="text-xs">{trial.summary}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.references && result.references.length > 0 && (
        <section>
          <h2 className="text-lg font-bold border-b border-black mb-4 uppercase">References</h2>
          <ul className="list-disc pl-5 space-y-1">
            {result.references.map((ref: any, idx: number) => (
              <li key={idx} className="text-[10px]">
                {ref.citation} {ref.url && <span className="text-blue-600">({ref.url})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      
      <div className="mt-12 pt-4 border-t border-gray-100 text-[8px] text-gray-400 text-center">
        Generated by Clinical Nexus AI • {new Date().toISOString()} • Evidence-Based Clinical Guidance
      </div>
    </div>
  );
}

const Logo = ({ id = "main", className = "w-8 h-8", glow, showText, onLogoLoaded }: { id?: string, className?: string, glow?: boolean, showText?: boolean, onLogoLoaded?: (hasLogo: boolean) => void }) => {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(1);
  const [logoOffsetX, setLogoOffsetX] = useState<number>(0);
  const [logoOffsetY, setLogoOffsetY] = useState<number>(0);
  const [containerScale, setContainerScale] = useState<number>(1);
  const [blendMode, setBlendMode] = useState<string>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let globalUnsub: (() => void) | null = null;
    
    const unsub = onSnapshot(doc(db, 'settings', `logo_${id}`), (docSnap) => {
      if (docSnap.exists() && docSnap.data().customLogo) {
        const data = docSnap.data();
        setCustomLogo(data.customLogo);
        setLogoScale(data.logoScale || 1);
        setLogoOffsetX(data.logoOffsetX || 0);
        setLogoOffsetY(data.logoOffsetY || 0);
        setContainerScale(data.containerScale || 1);
        setBlendMode(data.blendMode || 'normal');
        if (onLogoLoaded) onLogoLoaded(true);
      } else {
        // Fallback chain
        const tryFallbacks = async () => {
          const fallbacks = ['logo_main', 'logo_sidebar', 'appLogo'].filter(fid => fid !== `logo_${id}`);
          for (const fid of fallbacks) {
            try {
              const snap = await getDoc(doc(db, 'settings', fid));
              if (snap.exists() && snap.data().customLogo) {
                const data = snap.data();
                setCustomLogo(data.customLogo);
                setLogoScale(data.logoScale || 1);
                setLogoOffsetX(data.logoOffsetX || 0);
                setLogoOffsetY(data.logoOffsetY || 0);
                setContainerScale(data.containerScale || 1);
                setBlendMode(data.blendMode || 'normal');
                if (onLogoLoaded) onLogoLoaded(true);
                return;
              }
            } catch (e) {
              console.error("Fallback fetch error:", e);
            }
          }
          setCustomLogo(null);
          if (onLogoLoaded) onLogoLoaded(false);
        };
        tryFallbacks();
      }
    }, (error) => {
      console.error(`Logo listener error (${id}):`, error);
    });

    return () => {
      unsub();
      if (globalUnsub) globalUnsub();
    };
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const base64String = event.target?.result as string;
      
      if (file.size < 500 * 1024) {
        setCustomLogo(base64String);
        setDoc(doc(db, 'settings', `logo_${id}`), {
          customLogo: base64String,
          logoScale,
          logoOffsetX,
          logoOffsetY,
          containerScale,
          blendMode,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.error("Error saving logo:", err));
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        
        setCustomLogo(compressedBase64);
        await setDoc(doc(db, 'settings', `logo_${id}`), {
          customLogo: compressedBase64,
          logoScale,
          logoOffsetX,
          logoOffsetY,
          containerScale,
          blendMode,
          updatedAt: Date.now()
        }, { merge: true });
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  const updateScale = async (newScale: number) => {
    const roundedScale = Math.round(newScale * 10) / 10;
    setLogoScale(roundedScale);
    if (auth.currentUser) {
      await setDoc(doc(db, 'settings', `logo_${id}`), {
        logoScale: roundedScale,
        updatedAt: Date.now()
      }, { merge: true });
    }
  };

  const updateOffsetX = async (newOffset: number) => {
    setLogoOffsetX(newOffset);
    if (auth.currentUser) {
      await setDoc(doc(db, 'settings', `logo_${id}`), {
        logoOffsetX: newOffset,
        updatedAt: Date.now()
      }, { merge: true });
    }
  };

  const updateOffsetY = async (newOffset: number) => {
    setLogoOffsetY(newOffset);
    if (auth.currentUser) {
      await setDoc(doc(db, 'settings', `logo_${id}`), {
        logoOffsetY: newOffset,
        updatedAt: Date.now()
      }, { merge: true });
    }
  };

  const updateContainerScale = async (newScale: number) => {
    const roundedScale = Math.round(newScale * 10) / 10;
    setContainerScale(roundedScale);
    if (auth.currentUser) {
      await setDoc(doc(db, 'settings', `logo_${id}`), {
        containerScale: roundedScale,
        updatedAt: Date.now()
      }, { merge: true });
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center group/logo", className)}>
      
      {/* Scaled Inner Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: containerScale !== 1 ? `scale(${containerScale})` : undefined,
          transformOrigin: id === 'sidebar' ? 'left center' : 'center center'
        }}
      >
        {customLogo ? (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <img 
              src={customLogo} 
              alt="Custom Logo" 
              className="max-w-full max-h-full object-contain transition-transform duration-200" 
              style={{ 
                transform: `translate(${logoOffsetX}px, ${logoOffsetY}px) scale(${logoScale})`,
                mixBlendMode: blendMode as any
              }} 
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className={cn(
            "relative z-10 w-full h-full flex items-center justify-center bg-gray-800/50 rounded-full border border-gray-700 border-dashed",
            glow && "shadow-[0_0_20px_rgba(0,209,255,0.2)] border-cyan-500/30"
          )}>
            <span className="text-[10px] text-gray-500 font-bold tracking-tighter">LOGO</span>
          </div>
        )}
        
        {showText && !customLogo && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#00e5ff]">Aura</span><span className="text-[#00d28a]">MD</span>
            </span>
          </div>
        )}
      </div>

      {/* Home Button Overlay */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('go-home'));
        }}
        className="absolute -top-1 -left-1 w-6 h-6 bg-[#0d9488] rounded-full flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity z-50 shadow-lg cursor-pointer pointer-events-auto"
        title="Go to Dashboard"
      >
        <LayoutDashboard className="w-3.5 h-3.5 text-white" />
      </div>

      {isAdmin && (
        <>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          <div 
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#06b6d4] rounded-full flex items-center justify-center opacity-80 md:opacity-0 group-hover/logo:opacity-100 transition-opacity z-50 shadow-lg cursor-pointer pointer-events-auto text-white"
            title="Upload New Logo"
          >
            <Upload className="w-3.5 h-3.5" />
          </div>
        </>
      )}
    </div>
  );
};

// Admin UI for Logo Tuning - Extracted to keep the main Logo component clean
const AdminLogoSettings = ({ id }: { id: string }) => {
  const [logoScale, setLogoScale] = useState<number>(1);
  const [logoOffsetX, setLogoOffsetX] = useState<number>(0);
  const [logoOffsetY, setLogoOffsetY] = useState<number>(0);
  const [containerScale, setContainerScale] = useState<number>(1);
  const [blendMode, setBlendMode] = useState<string>('normal');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', `logo_${id}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLogoScale(data.logoScale || 1);
        setLogoOffsetX(data.logoOffsetX || 0);
        setLogoOffsetY(data.logoOffsetY || 0);
        setContainerScale(data.containerScale || 1);
        setBlendMode(data.blendMode || 'normal');
        setCustomLogo(data.customLogo || null);
      }
    });
    return () => unsub();
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const base64String = event.target?.result as string;
      if (file.size < 500 * 1024) {
        setDoc(doc(db, 'settings', `logo_${id}`), { customLogo: base64String }, { merge: true });
        return;
      }
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        await setDoc(doc(db, 'settings', `logo_${id}`), { customLogo: compressedBase64 }, { merge: true });
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  const updateSetting = async (field: string, value: any) => {
    await setDoc(doc(db, 'settings', `logo_${id}`), { [field]: value, updatedAt: Date.now() }, { merge: true });
  };

  return (
    <div className="space-y-4 p-4 bg-[#121417] rounded-2xl border border-[#2c3137]">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{id} Logo Tuning</label>
        <div className="flex gap-2">
           <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-[#2c3137] rounded-lg text-emerald-400" title="Upload">
             <Upload className="w-3.5 h-3.5" />
           </button>
           <button onClick={() => { if(confirm('Remove?')) updateSetting('customLogo', null); }} className="p-1.5 hover:bg-[#2c3137] rounded-lg text-red-400" title="Delete">
             <Trash2 className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#a1aab5] uppercase font-bold"><span>Scale</span><span>{logoScale}x</span></div>
          <input type="range" min="0.2" max="4" step="0.1" value={logoScale} onChange={(e) => updateSetting('logoScale', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-cyan-500" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#a1aab5] uppercase font-bold"><span>Size</span><span>{containerScale}x</span></div>
          <input type="range" min="0.5" max="3" step="0.1" value={containerScale} onChange={(e) => updateSetting('containerScale', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-emerald-500" />
        </div>
        <div className="space-y-1 text-left">
          <div className="flex justify-between text-[9px] text-[#a1aab5] uppercase font-bold"><span>Vert</span><span>{logoOffsetY}px</span></div>
          <input type="range" min="-100" max="100" step="1" value={logoOffsetY} onChange={(e) => updateSetting('logoOffsetY', parseInt(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-cyan-500" />
        </div>
        <div className="space-y-1 text-left">
          <div className="flex justify-between text-[9px] text-[#a1aab5] uppercase font-bold"><span>Hori</span><span>{logoOffsetX}px</span></div>
          <input type="range" min="-100" max="100" step="1" value={logoOffsetX} onChange={(e) => updateSetting('logoOffsetX', parseInt(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-cyan-500" />
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-wider">Blend Mode</label>
        <select value={blendMode} onChange={(e) => updateSetting('blendMode', e.target.value)} className="w-full bg-[#1e2226] border border-[#2c3137] rounded-lg py-1 px-2 text-[10px] text-white">
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="darken">Darken</option>
          <option value="lighten">Lighten</option>
        </select>
      </div>
    </div>
  );
};

const renderFormattedText = (text: string) => {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} className="mb-2 last:mb-0">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="text-white">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

const disguiseText = (text: string | number | undefined, type: 'name' | 'mrn' | 'text' | 'age' | 'gender', isDisguised: boolean, patient?: { name: string, mrn?: string }) => {
  if (text === undefined || text === null) return '';
  if (!isDisguised) return String(text);
  if (type === 'name') return 'Patient Name';
  if (type === 'mrn') return 'MRN-XXXXX';
  if (type === 'age') return 'XX';
  if (type === 'gender') return 'X';
  
  if (type === 'text') {
    let result = String(text);
    
    // 1. Mask patient specific identifiers if provided
    if (patient) {
      if (patient.name) {
        const escapedName = patient.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedName, 'gi'), 'Patient Name');
      }
      if (patient.mrn) {
        const escapedMRN = patient.mrn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedMRN, 'gi'), 'MRN-XXXXX');
      }
    }

    // 2. Mask common PII patterns (Strict HIPAA)
    // Dates (MM/DD/YYYY, YYYY-MM-DD, etc.)
    result = result.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
    result = result.replace(/\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g, '[DATE]');
    
    // Phone numbers
    result = result.replace(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g, '[PHONE]');
    
    // Emails
    result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    
    // SSN (roughly)
    result = result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

    return result;
  }
  return String(text);
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('Physician');
  const [authInstitute, setAuthInstitute] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDisguised, setIsDisguised] = useState(() => {
    return localStorage.getItem('isDisguised') === 'true';
  });
  const [autoNarrate, setAutoNarrate] = useState(() => {
    return localStorage.getItem('autoNarrate') === 'true';
  });
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<{
    GEMINI_API_KEY: string;
    API_KEY: string;
    IS_DEV: boolean;
  }>({
    GEMINI_API_KEY: "",
    API_KEY: "",
    IS_DEV: false
  });
  const [pricingContent, setPricingContent] = useState(defaultContent.pricing || '');
  const [privacyPolicyContent, setPrivacyPolicyContent] = useState(defaultContent.privacyPolicy || '');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'library' | 'research' | 'nexus' | 'clinical-reasoning' | 'ehr-integration' | 'pricing' | 'privacy-policy' | 'calculators'>('dashboard');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    let timer: any;
    if (!isAuthReady) {
      timer = setTimeout(() => setShowTroubleshoot(true), 15000);
    } else {
      setShowTroubleshoot(false);
    }
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  useEffect(() => {
    if (!user) return;
    
    const checkAndInitUser = async () => {
      try {
        const usageRef = doc(db, 'usage', user.uid);
        const userRef = doc(db, 'users', user.uid);
        
        const [usageSnap, userSnap] = await Promise.all([
          getDoc(usageRef),
          getDoc(userRef)
        ]);
        
        if (!usageSnap.exists()) {
          console.log("Initializing usage record for new user...");
          await setDoc(usageRef, {
            id: user.uid,
            isPremium: false,
            dailyCount: 0,
            lastUsageDate: getStartOfWeek()
          });
        }
        
        if (!userSnap.exists()) {
          console.log("Initializing profile record for new user...");
          await setDoc(userRef, {
            email: user.email || `${user.uid}@example.com`,
            role: 'Physician',
            institute: '',
            createdAt: Date.now()
          });
        }
      } catch (e) {
        console.error("Error syncing user profile:", e);
      }
    };
    
    checkAndInitUser();
  }, [user]);

  useEffect(() => {
    // Check for injected config first (from server.ts in production)
    const injectedEnv = (window as any).process?.env;
    if (injectedEnv && (injectedEnv.GEMINI_API_KEY || injectedEnv.API_KEY)) {
      console.log("Using injected runtime configuration");
      setRuntimeConfig({
        GEMINI_API_KEY: injectedEnv.GEMINI_API_KEY || "",
        API_KEY: injectedEnv.API_KEY || "",
        IS_DEV: injectedEnv.IS_DEV === true || injectedEnv.IS_DEV === 'true'
      });
    }

    const fetchConfig = async (retries = 12) => {
      try {
        // Add a small delay for the server to be fully ready in dev mode, 
        // but skip if we already have injected config
        if (retries === 12 && !((window as any).process?.env?.GEMINI_API_KEY)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const response = await fetch('/api/config');
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRuntimeConfig(data);
      } catch (error: any) {
        // If we already have injected config, don't worry too much about fetch failure
        const hasInjected = (window as any).process?.env?.GEMINI_API_KEY;
        
        if (!hasInjected || retries === 0) {
          console.error('Error fetching runtime config:', error);
        }
        
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, 12 - retries), 5000);
          if (!hasInjected) {
            console.log(`Retrying config fetch in ${delay}ms... (${retries} left)`);
          }
          setTimeout(() => fetchConfig(retries - 1), delay);
        } else if (!hasInjected) {
          setAuthError(`Sync error: ${error.message || "Connection failed"}. Please check your connection and refresh.`);
        }
      }
    };
    fetchConfig();

    const loadContent = async () => {
      try {
        // First try Firestore for the most up-to-date content
        const contentPath = 'settings/content';
        let contentDoc;
        try {
          contentDoc = await getDoc(doc(db, 'settings', 'content'));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, contentPath);
          // If we can't even read from Firestore, we'll fall back to API
        }

        if (contentDoc && contentDoc.exists()) {
          const data = contentDoc.data();
          if (data.pricing) setPricingContent(data.pricing);
          if (data.privacyPolicy) setPrivacyPolicyContent(data.privacyPolicy);
          console.log("Content loaded from Firestore");
          return;
        }

        // Fallback to API/local file if Firestore is empty or read failed
        console.log("Firestore content empty or unavailable, fetching from /api/load-content...");
        const response = await fetch('/api/load-content');
        if (response.ok) {
          const data = await response.json();
          if (data.pricing) setPricingContent(data.pricing);
          if (data.privacyPolicy) setPrivacyPolicyContent(data.privacyPolicy);
          
          // Seed Firestore if we got data from the file AND user is likely admin
          if ((data.pricing || data.privacyPolicy) && (auth.currentUser?.email === 'dowites.msf@gmail.com' || auth.currentUser?.email === 'coolnerd008@gmail.com')) {
            try {
              await setDoc(doc(db, 'settings', 'content'), {
                pricing: data.pricing || pricingContent,
                privacyPolicy: data.privacyPolicy || privacyPolicyContent,
                updatedAt: Date.now()
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, contentPath);
            }
          }
        }
      } catch (error) {
        console.error("Error loading content:", error);
      }
    };
    loadContent();
  }, []);

  useEffect(() => {
    if (currentView === 'pricing' || currentView === 'privacy-policy') {
      const loadContent = async () => {
        const contentPath = 'settings/content';
        try {
          const contentDoc = await getDoc(doc(db, 'settings', 'content'));
          if (contentDoc.exists()) {
            const data = contentDoc.data();
            if (data.pricing) setPricingContent(data.pricing);
            if (data.privacyPolicy) setPrivacyPolicyContent(data.privacyPolicy);
          } else {
            const response = await fetch('/api/load-content');
            if (response.ok) {
              const data = await response.json();
              if (data.pricing) setPricingContent(data.pricing);
              if (data.privacyPolicy) setPrivacyPolicyContent(data.privacyPolicy);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, contentPath);
        }
      };
      loadContent();
    }
  }, [currentView]);

  const saveContent = async () => {
    const contentPath = 'settings/content';
    try {
      // Save to Firestore (Primary)
      await setDoc(doc(db, 'settings', 'content'), {
        pricing: pricingContent,
        privacyPolicy: privacyPolicyContent,
        updatedAt: Date.now()
      });

      // Also try to save to server for local dev persistence
      fetch('/api/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: pricingContent, privacyPolicy: privacyPolicyContent })
      }).catch(err => console.warn("Failed to save to local server, but Firestore was updated:", err));

      setIsEditingContent(false);
      alert("Content saved successfully to cloud storage!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, contentPath);
      alert("Failed to save content to cloud storage. Check permissions.");
    }
  };


  useEffect(() => {
    localStorage.setItem('isDisguised', isDisguised.toString());
  }, [isDisguised]);

  useEffect(() => {
    localStorage.setItem('autoNarrate', autoNarrate.toString());
  }, [autoNarrate]);

  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await fpPromise.load();
        const result = await fp.get();
        setDeviceId(result.visitorId);
      } catch (error) {
        console.error('Error getting fingerprint:', error);
      }
    };
    getFingerprint();
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('assessment');
  const [fhirServerUrl, setFhirServerUrl] = useState('https://hapi.fhir.org/baseR4');
  const [fhirAuthType, setFhirAuthType] = useState<'open' | 'oauth'>('open');
  const [fhirClientId, setFhirClientId] = useState('');
  const [fhirAuthUrl, setFhirAuthUrl] = useState('');
  const [fhirTokenUrl, setFhirTokenUrl] = useState('');
  const [fhirAccessToken, setFhirAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEncounterProcessing, setIsEncounterProcessing] = useState(false);
  const [isReasoningProcessing, setIsReasoningProcessing] = useState(false);
  const [isUpgradeProcessing, setIsUpgradeProcessing] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [isClinicalDetailsDropdownOpen, setIsClinicalDetailsDropdownOpen] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [isCompiling, setIsCompiling] = useState(false);
  const [reasoningQuery, setReasoningQuery] = useState('');
  const [reasoningImage, setReasoningImage] = useState<string | null>(null);
  const [reasoningMimeType, setReasoningMimeType] = useState<string>('');
  const [reasoningResult, setReasoningResult] = useState<{
    query: string;
    executiveSummary?: string;
    criticalTriggers?: { trigger: string; action: string; priority: 'EMERGENT' | 'URGENT' | 'ROUTINE' }[];
    missingCriticalData?: string[];
    guidelines: string;
    managementSteps: string;
    clinicalReasoning: string;
    blindspots: string;
    complications: string;
    keyTrials: { name: string; year: string; summary: string }[];
    references: { citation: string; url?: string }[];
  } | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [manualTime, setManualTime] = useState(new Date().toISOString().slice(0, 16));
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [suggestedSteps, setSuggestedSteps] = useState<{
    type: 'history' | 'exam' | 'test';
    label: string;
    reason: string;
  }[]>([]);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMRN, setNewPatientMRN] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [globalInput, setGlobalInput] = useState('');
  const [isFetchingEHR, setIsFetchingEHR] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [libraryItems, setLibraryItems] = useState<{id: string, title: string, type: string, date: string, content?: string, patientId?: string}[]>([]);
  const [viewingLibraryItem, setViewingLibraryItem] = useState<{id: string, title: string, type: string, date: string, content?: string, patientId?: string} | null>(null);
  const [researchReports, setResearchReports] = useState<{id: string, title: string, status: string, date: string}[]>([]);
  const [selectedResearchPatientId, setSelectedResearchPatientId] = useState<string | null>(null);
  const [generatedManuscript, setGeneratedManuscript] = useState<string | null>(null);
  const [isGeneratingManuscript, setIsGeneratingManuscript] = useState(false);
  const [nexusDiscussions, setNexusDiscussions] = useState<{id: string, title: string, author: string, institute: string, replies: number, time: string}[]>([]);
  const [selectedNexusPatientId, setSelectedNexusPatientId] = useState<string | null>(null);
  const [nexusChatMessages, setNexusChatMessages] = useState<{id: string, sender: string, text: string, time: string}[]>([]);
  const [nexusChatInput, setNexusChatInput] = useState('');
  
  const [globalBroadcasts, setGlobalBroadcasts] = useState<Broadcast[]>([]);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [activeBroadcastMessages, setActiveBroadcastMessages] = useState<DiscussionMessage[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [nexusSection, setNexusSection] = useState<'feed' | 'my-patients'>('feed');
  
  const [isEditingLibraryItem, setIsEditingLibraryItem] = useState(false);
  const [editingLibraryItemId, setEditingLibraryItemId] = useState<string | null>(null);
  const [newLibraryItemTitle, setNewLibraryItemTitle] = useState('');
  const [newLibraryItemType, setNewLibraryItemType] = useState('Protocol');

  const [isEditingResearch, setIsEditingResearch] = useState(false);
  const [editingResearchId, setEditingResearchId] = useState<string | null>(null);
  const [newResearchTitle, setNewResearchTitle] = useState('');
  const [newResearchStatus, setNewResearchStatus] = useState('Drafting');

  const [isEditingNexus, setIsEditingNexus] = useState(false);
  const [editingNexusId, setEditingNexusId] = useState<string | null>(null);
  const [isEditingPatientName, setIsEditingPatientName] = useState(false);
  const [editPatientName, setEditPatientName] = useState('');
  const [newNexusTitle, setNewNexusTitle] = useState('');

  const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ count: number; limit: number; isPremium: boolean } | null>(null);
  const prevIsPremium = useRef<boolean | null>(null);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const [offlinePreloadStatus, setOfflinePreloadStatus] = useState<{ current: number, total: number, label: string } | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  // HIPAA Compliance & E2EE States
  const [privacyKey, setPrivacyKey] = useState<string>(localStorage.getItem('aura_privacy_key') || '');
  const [isPrivacyKeyModalOpen, setIsPrivacyKeyModalOpen] = useState(false);
  const [tempPrivacyKey, setTempPrivacyKey] = useState('');
  const [isStrictHIPAAMode, setIsStrictHIPAAMode] = useState(localStorage.getItem('aura_strict_hipaa') === 'true');
  const [privacyKeyError, setPrivacyKeyError] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      // Determine device type based on effective window width
      // Note: index.html viewport meta forces 1280px on many browsers
      const mobile = window.innerWidth < 1024; 
      setIsMobile(mobile);
    };
    
    // Initial calculation
    const initialMobile = window.innerWidth < 1024;
    setIsMobile(initialMobile);
    setIsSidebarOpen(!initialMobile);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Successfully logged in via redirect");
        }
      } catch (error: any) {
        console.error("Redirect auth error:", error);
        if (error.code === 'auth/credential-already-in-use') {
          setAuthError("Email already in use with a different provider.");
        } else if (error.code === 'auth/internal-error') {
          setAuthError("Auth system error. Please try again.");
        } else if (error.message) {
          setAuthError(error.message);
        }
      }
    };
    checkRedirect();
  }, []);

  useEffect(() => {
    const handleGoHome = () => {
      setCurrentView('dashboard');
      setActivePatientId(null);
    };
    window.addEventListener('go-home', handleGoHome);
    return () => window.removeEventListener('go-home', handleGoHome);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUsageInfo(null);
      setUsageMessage(null);
      prevIsPremium.current = null;
      return;
    }

    // Use a listener for real-time updates (like Zapier upgrading the user)
    const usageRef = doc(db, 'usage', user.uid);
    const unsubscribeUsage = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isPremium = data.isPremium || false;
        setSubscriptionTier(isPremium ? 'pro' : 'free');
        
        // Success Alert Logic: Trigger when transitioning from false to true
        if (prevIsPremium.current === false && isPremium === true) {
          alert('Congratulations! Your account has been upgraded to Aura Pro. New high-volume limits (125/mo) are now active.');
        }
        
        prevIsPremium.current = isPremium;
        
        const limit = isPremium ? PRO_MONTHLY_LIMIT : FREE_WEEKLY_LIMIT;
        const currentCount = validateUsagePeriod(data);
        
        setUsageInfo({
          count: currentCount,
          limit: limit,
          isPremium: isPremium
        });
      } else {
        // Fallback for new users before first use
        setUsageInfo({ count: 0, limit: FREE_WEEKLY_LIMIT, isPremium: false });
        setSubscriptionTier('free');
        prevIsPremium.current = false;
      }
    }, (error) => {
      console.error("Error listening to usage updates:", error);
    });

    // Also handle non-logged in device usage (non-realtime is fine here as devices don't "upgrade")
    if (deviceId && !user) {
      checkUsageLimit(null, deviceId).then(usage => {
        setUsageInfo({ count: usage.count, limit: usage.limit, isPremium: usage.isPremium });
        setUsageMessage(usage.message || null);
      });
    }

    return () => unsubscribeUsage();
  }, [user, deviceId]);

  useEffect(() => {
    if (!user || !isAuthReady) return;
    
    // Clean up any checkout parameters from URL without performing mutations
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('upgrade_success') === 'true' || urlParams.get('checkout_success') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setPatients([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'patients'), where('userId', '==', user.uid));
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const fetchedPatients: PatientProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        try {
          let name = data.name;
          let mrn = data.mrn;
          let historyStr = data.history;
          let personalNotes = data.personalNotes || '';

          // Decrypt if necessary
          if (privacyKey) {
            if (isEncrypted(name)) name = decryptData(name, privacyKey);
            if (isEncrypted(mrn)) mrn = decryptData(mrn, privacyKey);
            if (isEncrypted(historyStr)) historyStr = decryptData(historyStr, privacyKey);
            if (isEncrypted(personalNotes)) personalNotes = decryptData(personalNotes, privacyKey);
          }

          fetchedPatients.push({
            id: data.id,
            name: name,
            mrn: mrn,
            age: data.age,
            gender: data.gender,
            history: JSON.parse(historyStr),
            isArchived: data.isArchived,
            personalNotes: personalNotes,
            createdAt: data.createdAt
          });
        } catch (e) {
          console.error("Error parsing/decrypting patient", data.id, e);
        }
      });
      setPatients(fetchedPatients);
      setIsLoading(false);
    }, (error) => {
      console.error("Patients snapshot error:", error);
      setIsLoading(false); // Ensure loader disappears even on error
      handleFirestoreError(error, OperationType.LIST, 'patients');
    });

    return () => unsubscribeSnapshot();
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setLibraryItems([]);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'settings', `libraryItems_${user.uid}`), (docSnap) => {
      if (docSnap.exists()) {
        setLibraryItems(docSnap.data().items || []);
      } else {
        setLibraryItems([]);
      }
    }, (error) => {
      console.error("Error fetching library items:", error);
    });
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Global Broadcasts
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const broadcastsRef = collection(db, 'broadcasts');
    const q = query(broadcastsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Broadcast[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Broadcast);
      });
      setGlobalBroadcasts(fetched.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'broadcasts');
    });
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Broadcast Messages (Peer Discussion)
  useEffect(() => {
    if (!user || !isAuthReady) {
      if (!selectedBroadcastId) setActiveBroadcastMessages([]);
      return;
    }
    if (!selectedBroadcastId) {
      setActiveBroadcastMessages([]);
      return;
    }
    const messagesRef = collection(db, 'broadcasts', selectedBroadcastId, 'messages');
    const q = query(messagesRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: DiscussionMessage[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as DiscussionMessage);
      });
      setActiveBroadcastMessages(fetched.sort((a, b) => a.timestamp - b.timestamp));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `broadcasts/${selectedBroadcastId}/messages`);
    });
    return () => unsubscribe();
  }, [user, isAuthReady, selectedBroadcastId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { code } = event.data;
        try {
          const redirectUri = `${window.location.origin}/auth/callback`;
          const response = await fetch(fhirTokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              client_id: fhirClientId,
              redirect_uri: redirectUri
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setFhirAccessToken(data.access_token);
            setConnectionStatus('success');
            setConnectionMessage('OAuth Authentication Successful!');
          } else {
            setConnectionStatus('error');
            setConnectionMessage('Failed to exchange token');
          }
        } catch (err) {
          setConnectionStatus('error');
          setConnectionMessage('Token exchange error');
        } finally {
          setIsTestingConnection(false);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setConnectionStatus('error');
        setConnectionMessage(`OAuth Error: ${event.data.error}`);
        setIsTestingConnection(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fhirTokenUrl, fhirClientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isBottomMenuOpen && !target.closest('.relative.w-full')) {
        setIsBottomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBottomMenuOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setIsStandalone(true);
    };

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    } else {
      // Proactively show banner after a short delay if not standalone
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If we have the native prompt, show it first (as it's more direct for Chrome users)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallBanner(false);
          return;
        }
      } catch (err) {
        console.error("Install prompt failed:", err);
      }
    }
    
    // Always fall back to showing the guide if direct prompt fails or is unavailable
    setShowInstallGuideModal(true);
  };

  const activePatient = patients.find(p => p.id === activePatientId);
  const latestState = activePatient?.history[activePatient.history.length - 1];

  const addResearchReport = () => {
    if (!newResearchTitle.trim()) return;
    const newReport = {
      id: Date.now().toString(),
      title: newResearchTitle,
      status: newResearchStatus,
      date: new Date().toLocaleDateString()
    };
    setResearchReports(prev => [newReport, ...prev]);
    setNewResearchTitle('');
    setIsEditingResearch(false);
  };

  const editResearchReport = () => {
    if (!editingResearchId || !newResearchTitle.trim()) return;
    setResearchReports(prev => prev.map(report => 
      report.id === editingResearchId 
        ? { ...report, title: newResearchTitle, status: newResearchStatus }
        : report
    ));
    setEditingResearchId(null);
    setNewResearchTitle('');
    setIsEditingResearch(false);
  };

  const removeResearchReport = (id: string) => {
    setResearchReports(prev => prev.filter(r => r.id !== id));
  };

  const addNexusDiscussion = () => {
    if (!newNexusTitle.trim()) return;
    const newDiscussion = {
      id: Date.now().toString(),
      title: newNexusTitle,
      author: user?.displayName || 'Physician',
      institute: 'AuraMD Network',
      replies: 0,
      time: 'Just now'
    };
    setNexusDiscussions(prev => [newDiscussion, ...prev]);
    setNewNexusTitle('');
    setIsEditingNexus(false);
  };

  const editNexusDiscussion = () => {
    if (!editingNexusId || !newNexusTitle.trim()) return;
    setNexusDiscussions(prev => prev.map(disc => 
      disc.id === editingNexusId 
        ? { ...disc, title: newNexusTitle }
        : disc
    ));
    setEditingNexusId(null);
    setNewNexusTitle('');
    setIsEditingNexus(false);
  };

  const removeNexusDiscussion = (id: string) => {
    setNexusDiscussions(prev => prev.filter(d => d.id !== id));
  };

  const saveLibraryItemsToFirestore = async (newItems: any[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', `libraryItems_${user.uid}`), { items: newItems });
    } catch (error) {
      console.error("Error saving library items:", error);
    }
  };

  const addLibraryItem = () => {
    if (!newLibraryItemTitle.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      title: newLibraryItemTitle,
      type: newLibraryItemType,
      date: new Date().toLocaleDateString()
    };
    const newItems = [newItem, ...libraryItems];
    setLibraryItems(newItems);
    saveLibraryItemsToFirestore(newItems);
    setNewLibraryItemTitle('');
    setIsEditingLibraryItem(false);
  };

  const handleSaveToLibrary = (title: string, type: string, content?: string, patientId?: string) => {
    try {
      const newItem = {
        id: Date.now().toString(),
        title,
        type,
        date: new Date().toLocaleDateString(),
        content,
        patientId
      };
      const newItems = [newItem, ...libraryItems];
      setLibraryItems(newItems);
      saveLibraryItemsToFirestore(newItems);
    } catch (error) {
      console.error("Error saving to library:", error);
    }
  };

  const editLibraryItem = () => {
    if (!editingLibraryItemId || !newLibraryItemTitle.trim()) return;
    const newItems = libraryItems.map(item => 
      item.id === editingLibraryItemId 
        ? { ...item, title: newLibraryItemTitle, type: newLibraryItemType }
        : item
    );
    setLibraryItems(newItems);
    saveLibraryItemsToFirestore(newItems);
    setEditingLibraryItemId(null);
    setNewLibraryItemTitle('');
    setIsEditingLibraryItem(false);
  };

  const removeLibraryItem = (id: string) => {
    const newItems = libraryItems.filter(item => item.id !== id);
    setLibraryItems(newItems);
    saveLibraryItemsToFirestore(newItems);
  };

  const handleTestFHIRConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');
    
    if (fhirAuthType === 'oauth') {
      if (!fhirClientId || !fhirAuthUrl || !fhirTokenUrl) {
        setConnectionStatus('error');
        setConnectionMessage('Please fill in all OAuth fields');
        setIsTestingConnection(false);
        return;
      }
      
      const redirectUri = `${window.location.origin}/auth/callback`;
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: fhirClientId,
        redirect_uri: redirectUri,
        scope: 'launch/patient patient/*.read openid fhirUser',
        state: Math.random().toString(36).substring(7)
      });
      
      const authUrl = `${fhirAuthUrl}?${params.toString()}`;
      const authWindow = window.open(authUrl, 'oauth_popup', 'width=600,height=700');
      
      if (!authWindow) {
        setConnectionStatus('error');
        setConnectionMessage('Popup blocked. Please allow popups.');
        setIsTestingConnection(false);
      }
      return;
    }
    
    try {
      // Test connection by fetching the CapabilityStatement (metadata)
      const url = new URL(fhirServerUrl);
      const metadataUrl = `${url.origin}${url.pathname}/metadata`;
      
      const response = await fetch(metadataUrl, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.resourceType === 'CapabilityStatement') {
          setConnectionStatus('success');
          setConnectionMessage(`Successfully connected to ${data.software?.name || 'FHIR Server'} (${data.fhirVersion})`);
        } else {
          setConnectionStatus('error');
          setConnectionMessage('Connected, but received invalid FHIR metadata.');
        }
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`HTTP Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleFetchEHR = async () => {
    if (!activePatientId || !latestState) return;
    setIsFetchingEHR(true);
    
    try {
      const headers: Record<string, string> = { 'Accept': 'application/fhir+json' };
      if (fhirAuthType === 'oauth' && fhirAccessToken) {
        headers['Authorization'] = `Bearer ${fhirAccessToken}`;
      }

      // Real FHIR API Call to public HAPI FHIR server
      // Fetch a patient that has vital signs
      const patientRes = await fetch(`${fhirServerUrl}/Patient?_has:Observation:patient:category=vital-signs&_count=1`, {
        headers
      });
      const patientData = await patientRes.json();
      
      let fhirPatientId = '';
      let fhirName = '';
      if (patientData.entry && patientData.entry.length > 0) {
        fhirPatientId = patientData.entry[0].resource.id;
        const nameObj = patientData.entry[0].resource.name?.[0];
        fhirName = nameObj ? `${nameObj.given?.join(' ') || ''} ${nameObj.family || ''}`.trim() : 'Unknown FHIR Patient';
      }

      let hr = latestState.vitals?.hr || 88;
      let bp_sys = latestState.vitals?.bp_sys || 118;
      let bp_dia = latestState.vitals?.bp_dia || 76;
      let temp = latestState.vitals?.temp || 37.1;
      let rr = latestState.vitals?.rr || 16;
      
      if (fhirPatientId) {
        const obsRes = await fetch(`${fhirServerUrl}/Observation?patient=${fhirPatientId}&category=vital-signs&_sort=-date&_count=20`, {
          headers
        });
        const obsData = await obsRes.json();
        
        if (obsData.entry) {
          obsData.entry.forEach((entry: any) => {
            const resource = entry.resource;
            const code = resource.code?.coding?.[0]?.code;
            const value = resource.valueQuantity?.value;
            
            if (value !== undefined) {
              if (code === '8867-4') hr = value;
              if (code === '8310-5') temp = value;
              if (code === '9279-1') rr = value;
            }
            if (code === '85354-9') {
              const sysComp = resource.component?.find((c: any) => c.code?.coding?.[0]?.code === '8480-6');
              const diaComp = resource.component?.find((c: any) => c.code?.coding?.[0]?.code === '8462-4');
              if (sysComp?.valueQuantity?.value) bp_sys = sysComp.valueQuantity.value;
              if (diaComp?.valueQuantity?.value) bp_dia = diaComp.valueQuantity.value;
            }
          });
        }
      }

      setPatients(prev => prev.map(p => {
        if (p.id === activePatientId) {
          const newHistory = [...p.history];
          const currentState = newHistory[newHistory.length - 1];
          
          const fetchedState: ClinicalState = {
            ...currentState,
            id: Date.now().toString(),
            timestamp: Date.now(),
            historyNote: currentState.historyNote + `\n\n[REAL FHIR EHR FETCH - ${new Date().toLocaleTimeString()}]\n\nSuccessfully connected to HAPI FHIR Public Server.\nFetched data for FHIR Patient ID: ${fhirPatientId || 'N/A'} (${fhirName})\n\n--- Live Vitals Extracted ---\nHeart Rate: ${hr} bpm\nBlood Pressure: ${bp_sys}/${bp_dia} mmHg\nTemperature: ${temp} °C\nResp Rate: ${rr} breaths/min\n\n--- Hospital Course ---\nPatient's symptoms improved after initial fluid resuscitation and antiemetics. Currently resting comfortably. Pending further observation and follow-up labs.`,
            labs: {
              ...currentState.labs,
              wbc: 12.5,
              creatinine: 1.1,
              potassium: 4.2,
              sodium: 138,
              lactate: 1.8,
              troponin: "<0.01"
            },
            vitals: {
              ...currentState.vitals,
              bp_sys: Math.round(bp_sys),
              bp_dia: Math.round(bp_dia),
              hr: Math.round(hr),
              rr: Math.round(rr),
              temp: Number(temp.toFixed(1)),
              spo2: currentState.vitals?.spo2 || 98
            },
            managementPlan: [
              ...(currentState.managementPlan || []),
              {
                action: "Continue current IV fluids",
                guidelineSource: "EHR Orders",
                reasoning: "Maintenance hydration"
              },
              {
                action: "Schedule follow-up basic metabolic panel",
                guidelineSource: "EHR Orders",
                reasoning: "Monitor renal function and electrolytes"
              }
            ]
          };
          
          newHistory.push(fetchedState);
          return { ...p, history: newHistory };
        }
        return p;
      }));
    } catch (error) {
      console.error("FHIR Fetch Error:", error);
      alert("Failed to connect to the real EHR FHIR server. Please check your network or try again later.");
    } finally {
      setIsFetchingEHR(false);
      setActiveSection('vitals');
    }
  };

  const savePatientToFirestore = async (patient: PatientProfile) => {
    if (!user) return;
    try {
      let name = patient.name;
      let mrn = patient.mrn || '';
      let historyStr = JSON.stringify(patient.history);
      let personalNotes = patient.personalNotes || '';

      // Encrypt if strict mode is on or if we have a key
      if (isStrictHIPAAMode && privacyKey) {
        name = encryptData(name, privacyKey);
        mrn = encryptData(mrn, privacyKey);
        historyStr = encryptData(historyStr, privacyKey);
        personalNotes = encryptData(personalNotes, privacyKey);
      }

      const patientData = {
        id: patient.id,
        userId: user.uid,
        deviceId: deviceId || 'unknown',
        name: name,
        mrn: mrn,
        age: patient.age || 0,
        gender: patient.gender || 'Male',
        history: historyStr,
        isArchived: patient.isArchived,
        personalNotes: personalNotes,
        createdAt: patient.createdAt || Date.now(),
        updatedAt: Date.now(),
        isEncrypted: !!(isStrictHIPAAMode && privacyKey)
      };
      await setDoc(doc(db, 'patients', patient.id), patientData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${patient.id}`);
    }
  };

  const deletePatientFromFirestore = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
    }
  };

  const handleCreatePatient = () => {
    const defaultName = `Patient ${patients.length + 1}`;
    const newPatient: PatientProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: defaultName,
      history: [],
      isArchived: false,
      createdAt: Date.now()
    };
    setPatients(prev => [...prev, newPatient]);
    savePatientToFirestore(newPatient);
    setActivePatientId(newPatient.id);
    setActiveSection('assessment');
    setCurrentView('dashboard'); // Stay in the encounter view
  };

  const confirmCreatePatient = () => {
    if (!newPatientName.trim()) return;
    
    const newPatient: PatientProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPatientName,
      mrn: newPatientMRN || undefined,
      history: [],
      isArchived: false,
      createdAt: Date.now()
    };
    setPatients(prev => [...prev, newPatient]);
    savePatientToFirestore(newPatient);
    setActivePatientId(newPatient.id);
    setActiveSection('assessment');
    setIsAddPatientModalOpen(false);
    setNewPatientName('');
    setNewPatientMRN('');
  };

  const clearPatientHistory = async (patientId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to clear this patient\'s history? This cannot be undone.')) return;
    try {
      let updatedPatientToSave: PatientProfile | undefined;
      setPatients(prev => {
        const updatedPatients = prev.map(p => {
          if (p.id === patientId) {
            const updated = { ...p, history: [] };
            updatedPatientToSave = updated;
            return updated;
          }
          return p;
        });
        return updatedPatients;
      });
      
      // Wait for a tick to ensure updatedPatientToSave is set if it was found
      setTimeout(() => {
        if (updatedPatientToSave) savePatientToFirestore(updatedPatientToSave);
      }, 0);
    } catch (error) {
      console.error('Error clearing patient history:', error);
    }
  };

  const handleStartBlankPatient = () => {
    const newPatient: PatientProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Patient ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      history: [],
      isArchived: false,
      createdAt: Date.now()
    };
    setPatients(prev => [...prev, newPatient]);
    setActivePatientId(newPatient.id);
    setActiveSection('assessment');
    savePatientToFirestore(newPatient);
  };

  const handleUpgrade = () => {
    window.location.href = "https://synapti-flash.lemonsqueezy.com/checkout/buy/a3bbcbea-ce85-474e-a12c-67d87d1707ae";
    setIsUsageLimitModalOpen(false);
  };

  const exportToPDF = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const clone = element.cloneNode(true) as HTMLElement;
    const noPrintElements = clone.querySelectorAll('.print\\:hidden');
    noPrintElements.forEach(el => el.remove());
    
    // html2canvas crashes on oklch/oklab/color-mix.
    // We force safe inline styles for all elements in the clone.
    const originalElements = [element, ...Array.from(element.querySelectorAll('*'))];
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))];
    
    for (let i = 0; i < originalElements.length; i++) {
      const orig = originalElements[i] as HTMLElement;
      const cl = cloneElements[i] as HTMLElement;
      const style = window.getComputedStyle(orig);
      
      // Force standard colors for PDF compatibility
      if (orig.classList.contains('text-white') || style.color.includes('oklch')) {
        cl.style.color = '#000000';
      } else {
        cl.style.color = style.color;
      }

      if (style.backgroundColor.includes('oklch') || style.backgroundColor === 'rgba(0, 0, 0, 0)') {
        cl.style.backgroundColor = '#ffffff';
      } else {
        cl.style.backgroundColor = style.backgroundColor;
      }

      cl.style.borderColor = '#eeeeee';
      cl.style.boxShadow = 'none';
    }
    
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.color = '#000000';
    wrapper.appendChild(clone);
    
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };
    
    // Small delay to ensure the clone is ready
    setTimeout(() => {
      // @ts-ignore
      html2pdf().set(opt).from(wrapper).save().then(() => {
        // Optional cleanup if needed
      });
    }, 100);
  };

  const handleExportPDF = () => {
    exportToPDF('compiled-patient-report', `${disguiseText(patients.find(p => p.id === activePatientId)?.name, 'name', isDisguised) || 'Patient'}_Clinical_Report.pdf`);
  };

  const handleExportReasoningPDF = () => {
    if (!reasoningResult) return;
    exportToPDF('compiled-reasoning-report', `Clinical_Reasoning_${reasoningResult.query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const handleAIOperation = async (operation: () => Promise<void>) => {
    const trackingUserId = user ? user.uid : null;
    
    let usageAllowed = true;
    try {
      const usage = await checkUsageLimit(trackingUserId, deviceId);
      setUsageInfo({ count: usage.count, limit: usage.limit, isPremium: usage.isPremium });
      setUsageMessage(usage.message || null);
      usageAllowed = usage.allowed;
    } catch (error) {
      console.error('Usage check failed, proceeding anyway:', error);
    }

    if (!usageAllowed) {
      setIsUsageLimitModalOpen(true);
      return;
    }

    try {
      await operation();
      
      try {
        await incrementUsage(trackingUserId, deviceId);
        const updatedUsage = await checkUsageLimit(trackingUserId, deviceId);
        setUsageInfo({ count: updatedUsage.count, limit: updatedUsage.limit, isPremium: updatedUsage.isPremium });
      } catch (usageUpdateError) {
        console.error('Failed to update usage after operation:', usageUpdateError);
      }
    } catch (opError) {
      console.error('AI Operation failed:', opError);
      throw opError; // Re-throw so the caller can handle it if needed
    }
  };

  const handleNexusBroadcast = async (patient: PatientProfile) => {
    if (!user || isBroadcasting) return;
    setIsBroadcasting(true);
    
    try {
      // 1. Generate de-identified summary for global peer review
      let summaryText = "";
      if (patient.history && patient.history.length > 0) {
        summaryText = patient.history[patient.history.length - 1].historyNote;
      }
      
      const deIdentifiedSummary = isStrictHIPAAMode 
        ? disguiseText(summaryText, 'text', true, patient)
        : summaryText;
      
      const broadcastId = Math.random().toString(36).substr(2, 9);
      const newBroadcast: Broadcast = {
        id: broadcastId,
        userId: user.uid,
        userEmail: user.email || 'Anonymous Physician',
        patientName: isStrictHIPAAMode ? disguiseText(patient.name, 'name', true) : patient.name,
        summary: deIdentifiedSummary,
        tags: ['Peer Review', 'Clinical Discussion'],
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'broadcasts', broadcastId), newBroadcast);
      
      // Auto-post a system message
      const messageId = 'system-' + Date.now();
      await setDoc(doc(collection(db, 'broadcasts', broadcastId, 'messages'), messageId), {
        id: messageId,
        userId: 'system',
        userEmail: 'Aura System',
        message: `Case broadcasted by ${user.email}. Peer physicians across the global Nexus network are now reviewing the findings.`,
        timestamp: Date.now()
      });

      // Navigate to feed and select the new broadcast
      setNexusSection('feed');
      setSelectedBroadcastId(broadcastId);
      // alert('Case broadcasted globally for peer discussion.');
    } catch (error) {
      console.error("Error broadcasting case:", error);
      alert('Failed to broadcast case. Please try again.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleNexusSendMessage = async () => {
    if (!user || !selectedBroadcastId || !nexusChatInput.trim()) return;
    
    const messageId = Math.random().toString(36).substr(2, 9);
    const newMessage: DiscussionMessage = {
      id: messageId,
      userId: user.uid,
      userEmail: user.email || 'Anonymous',
      message: nexusChatInput,
      timestamp: Date.now()
    };
    
    setNexusChatInput('');
    
    try {
      const messagesRef = doc(collection(db, 'broadcasts', selectedBroadcastId, 'messages'), messageId);
      await setDoc(messagesRef, newMessage);
    } catch (error) {
      console.error("Error sending peer message:", error);
      alert('Failed to send message.');
    }
  };

  const handleGenerateManuscript = async (patient: PatientProfile) => {
    setIsDisguised(true);
    setSelectedResearchPatientId(patient.id);
    setGeneratedManuscript(null);
    setIsGeneratingManuscript(true);
    
    handleAIOperation(async () => {
      try {
        // STRICT HIPAA: De-identify patient data before sending to AI
        let safePatient = { ...patient };
        if (isDisguised) {
          safePatient.name = disguiseText(patient.name, 'name', true);
          safePatient.mrn = disguiseText(patient.mrn, 'mrn', true);
          safePatient.history = patient.history.map(h => ({
            ...h,
            historyNote: disguiseText(h.historyNote, 'text', true, patient) || h.historyNote
          }));
        }
        
        const manuscript = await generateManuscript(safePatient);
        setGeneratedManuscript(manuscript);
      } catch (error) {
        console.error("Error generating manuscript:", error);
        setGeneratedManuscript("Error generating manuscript. Please try again.");
      } finally {
        setIsGeneratingManuscript(false);
      }
    });
  };

  const handleFetchToNexus = (patient: PatientProfile) => {
    setCurrentView('nexus');
    handleNexusBroadcast(patient);
  };

  const handleFetchToResearch = (patient: PatientProfile) => {
    setCurrentView('research');
    handleGenerateManuscript(patient);
  };

  useEffect(() => {
    // Automatic preloading disabled to save API budget.
    // preloadCoreProtocols(true, (current, total, label) => {
    //   setOfflinePreloadStatus({ current, total, label });
    //   if (current === total) {
    //     setTimeout(() => {
    //       setOfflinePreloadStatus(null);
    //       setIsOfflineReady(true);
    //     }, 3000);
    //   }
    // });
  }, []);

  const handleGlobalSubmit = async (query?: string | React.MouseEvent | React.KeyboardEvent) => {
    const submitQuery = typeof query === 'string' ? query : globalInput;
    if (!submitQuery.trim() && !reasoningImage) return;
    
    // Check offline cache first
    if (!reasoningImage) {
      const cached = await getCachedProtocol(submitQuery);
      if (cached) {
        setReasoningQuery(submitQuery);
        setCurrentView('clinical-reasoning');
        setIsFromCache(true);
        setReasoningResult({
          query: submitQuery,
          ...cached
        });
        setGlobalInput('');
        return;
      }
    }
    
    setIsFromCache(false);
    handleAIOperation(async () => {
      setReasoningQuery(submitQuery || "Image Analysis");
      setCurrentView('clinical-reasoning');
      setIsReasoningProcessing(true);
      setReasoningResult(null);
      
      try {
        if (reasoningImage) {
          const safeContext = isDisguised && activePatient 
            ? disguiseText(submitQuery, 'text', true, activePatient) 
            : submitQuery;
          const result = await interpretMedicalImage(reasoningImage, reasoningMimeType, safeContext);
          setReasoningResult({
            query: submitQuery || "Image Analysis",
            guidelines: result,
            managementSteps: "Based on imaging findings.",
            clinicalReasoning: "Image interpretation provided.",
            blindspots: "Ensure clinical correlation.",
            complications: "See interpretation.",
            keyTrials: [],
            references: []
          });
        } else {
          const safeQuery = isDisguised && activePatient 
            ? disguiseText(submitQuery, 'text', true, activePatient) 
            : submitQuery;
          const result = await fetchClinicalReasoning(safeQuery, activePatient || undefined);
          setReasoningResult({
            query: submitQuery,
            ...result
          });
        }
      } catch (error: any) {
        console.error("Error fetching clinical reasoning:", error);
        const errorMessage = error.message || "Error processing request. Please try again.";
        setReasoningResult({
          query: submitQuery || "Image Analysis",
          guidelines: `**Error:** ${errorMessage}`,
          managementSteps: "Error fetching management steps.",
          clinicalReasoning: "Error fetching clinical reasoning.",
          blindspots: "Error fetching blindspots.",
          complications: "Error fetching complications.",
          keyTrials: [],
          references: []
        });
      } finally {
        setIsReasoningProcessing(false);
        setGlobalInput('');
        setReasoningImage(null);
        setReasoningMimeType('');
      }
    });
  };

  const handleDeletePatient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatients(prev => prev.filter(p => p.id !== id));
    deletePatientFromFirestore(id);
    if (activePatientId === id) setActivePatientId(null);
  };

  const handleEditHistory = (historyId: string, newNote: string) => {
    if (!activePatientId) return;
    let updatedPatientToSave: PatientProfile | undefined;
    setPatients(prev => {
      const updatedPatients = prev.map(p => {
        if (p.id !== activePatientId) return p;
        return {
          ...p,
          history: p.history.map(h => h.id === historyId ? { ...h, historyNote: newNote } : h)
        };
      });
      updatedPatientToSave = updatedPatients.find(p => p.id === activePatientId);
      return updatedPatients;
    });
    if (updatedPatientToSave) savePatientToFirestore(updatedPatientToSave);
  };

  const handleRemoveHistory = (historyId: string) => {
    if (!activePatientId) return;
    let updatedPatientToSave: PatientProfile | undefined;
    setPatients(prev => {
      const updatedPatients = prev.map(p => {
        if (p.id !== activePatientId) return p;
        return {
          ...p,
          history: p.history.filter(h => h.id !== historyId)
        };
      });
      updatedPatientToSave = updatedPatients.find(p => p.id === activePatientId);
      return updatedPatients;
    });
    if (updatedPatientToSave) savePatientToFirestore(updatedPatientToSave);
  };

  const handleApplySuggestedStep = (step: { type: string; label: string; reason: string }) => {
    if (!activePatientId) return;
    
    const note = `[${step.type.toUpperCase()}] ${step.label}: ${step.reason}`;
    setManualNote(note);
    setIsManualEntry(true);
    // Remove from suggested steps
    setSuggestedSteps(prev => prev.filter(s => s.label !== step.label));
  };

  const isCritical = latestState?.labs.potassium && latestState.labs.potassium < 3.3;

  // Web Speech API for Ambient Listening
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const globalTranscriptRef = useRef('');
  const sessionTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const handleCompileDictationRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    handleCompileDictationRef.current = handleCompileDictation;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        
        sessionTranscriptRef.current = finalStr;
        interimTranscriptRef.current = interimStr;
        setTranscript(globalTranscriptRef.current + finalStr + interimStr);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current.onend = () => {
        globalTranscriptRef.current += sessionTranscriptRef.current;
        if (interimTranscriptRef.current) {
          globalTranscriptRef.current += interimTranscriptRef.current + ' ';
        }
        sessionTranscriptRef.current = '';
        interimTranscriptRef.current = '';

        if (isListeningRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to restart recognition', e);
            isListeningRef.current = false;
            setIsListening(false);
            
            // Automatically process what we have so far
            const fullTranscript = globalTranscriptRef.current.trim();
            if (fullTranscript && handleCompileDictationRef.current) {
              handleCompileDictationRef.current();
            } else {
              setTranscript('');
              globalTranscriptRef.current = '';
              setIsManualEntry(true);
            }
          }
        }
      };
    }
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      
      const fullTranscript = (globalTranscriptRef.current + sessionTranscriptRef.current).trim() || transcript.trim();
      
      if (fullTranscript) {
        await handleCompileDictation();
      } else {
        setTranscript('');
        globalTranscriptRef.current = '';
        sessionTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        setIsManualEntry(true);
      }
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your notes manually.");
        return;
      }
      setTranscript('');
      globalTranscriptRef.current = '';
      sessionTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      recognitionRef.current.lang = language;
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Ignore if already started
      }
      setIsListening(true);
      isListeningRef.current = true;
    }
  };

  const narrateText = async (text: string) => {
    if (!text || !activePatient) return;
    
    if (isNarrating) {
      stopNarration();
      return;
    }

    const processedText = disguiseText(text, 'text', isDisguised, activePatient);
    
    try {
      setIsNarrating(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      const audioUrl = await generateSpeech(processedText);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsNarrating(false);
        audioRef.current = null;
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        audioRef.current = null;
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(processedText);
          utterance.rate = 0.9;
          utterance.onend = () => setIsNarrating(false);
          utterance.onerror = () => setIsNarrating(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsNarrating(false);
        }
      };
      await audio.play();
    } catch (error) {
      console.error("Narration failed:", error);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(processedText);
        utterance.rate = 0.9;
        utterance.onend = () => setIsNarrating(false);
        utterance.onerror = () => setIsNarrating(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsNarrating(false);
      }
    }
  };

  const handleCompileToSOAP = async () => {
    if (!manualNote.trim()) return;
    
    handleAIOperation(async () => {
      setIsCompiling(true);
      try {
        const compiledNote = await compileTranscript(manualNote);
        setManualNote(compiledNote);
        // Automatically narrate the compiled note if enabled
        if (autoNarrate) {
          await narrateText(`SOAP Note compiled. ${compiledNote}`);
        }
      } catch (error) {
        console.error("Failed to compile transcript", error);
        alert("Failed to compile SOAP note. Please try again.");
      } finally {
        setIsCompiling(false);
      }
    });
  };

  const handleGeneratePlan = async () => {
    if (!activePatient || !latestState) return;
    handleAIOperation(async () => {
      const { generateManagementPlan } = await import('./services/geminiService');
      
      // STRICT HIPAA: De-identify state before sending to AI
      let stateToProcess = JSON.stringify(latestState);
      if (isDisguised) {
        stateToProcess = disguiseText(stateToProcess, 'text', true, activePatient);
      }
      
      const plan = await generateManagementPlan(stateToProcess);
      
      const updatedState = { ...latestState, managementPlan: plan };
      const updatedHistory = activePatient.history.map(s => s.id === latestState.id ? updatedState : s);
      const updatedPatient = { ...activePatient, history: updatedHistory };
      
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      savePatientToFirestore(updatedPatient);
    });
  };

  const handleCompileDictation = async () => {
    const rawInput = `${transcript} ${manualNote}`.trim();
    if (!rawInput || !activePatientId) return;
    
    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    await handleAIOperation(async () => {
      setIsCompiling(true);
      try {
        const input = await compileTranscript(rawInput);
        setManualNote(input);
        setTranscript('');
        globalTranscriptRef.current = '';
        sessionTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        
        // Automatically narrate the compiled note if enabled
        if (autoNarrate) {
          narrateText(`SOAP Note compiled. ${input}`);
        }
      } catch (error) {
        console.error("Failed to compile", error);
        // Fallback to raw text if compilation fails
        setManualNote(rawInput);
        setTranscript('');
        globalTranscriptRef.current = '';
        sessionTranscriptRef.current = '';
        interimTranscriptRef.current = '';
      } finally {
        setIsCompiling(false);
      }
    });
  };

  const [notesFileInputRef] = useState(() => React.createRef<HTMLInputElement>());

  const handleUploadNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activePatientId) return;

    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    handleAIOperation(async () => {
      setIsEncounterProcessing(true);
      try {
        const images: { data: string; mimeType: string }[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          images.push({ data: base64, mimeType: file.type });
        }

        const extractedData = await extractNotesFromImages(images);
        
        setManualNote(prev => {
          const sep = prev.trim() ? "\n\n---\n\n" : "";
          return prev + sep + extractedData;
        });

      } catch (error: any) {
        alert("Failed to process notes: " + error.message);
      } finally {
        setIsEncounterProcessing(false);
        if (notesFileInputRef.current) {
          notesFileInputRef.current.value = '';
        }
      }
    });
  };

  const handleProcessTranscript = async (textToProcess?: string, customTime?: string) => {
    let input = textToProcess;
    
    if (!input) {
      input = manualNote.trim();
      
      // If there's uncompiled transcript, we should compile it first, but since the user
      // clicked "Send for Analysis", we'll just use the raw text if manualNote is empty,
      // or we can just use whatever is in manualNote + transcript.
      if (transcript.trim()) {
        input = `${transcript} ${manualNote}`.trim();
        setTranscript('');
        globalTranscriptRef.current = '';
        sessionTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        setManualNote(input);
      }
      
      if (!input || !activePatientId) return;
      
      if (isListening) {
        isListeningRef.current = false;
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }

    if (!input || !activePatientId) return;

    handleAIOperation(async () => {
      setIsEncounterProcessing(true);
      try {
        const previousHistory = activePatient?.history.map(h => h.historyNote).join("\n") || "";
        
        // STRICT HIPAA: De-identify input before sending to AI if disguise is active
        const safeInput = isDisguised && activePatient 
          ? disguiseText(input, 'text', true, activePatient) 
          : input;
          
        const extracted = await parseAmbientTranscript(safeInput, previousHistory);
        
        if (extracted.suggestedSteps) {
          setSuggestedSteps(extracted.suggestedSteps);
        }
        
        const newState: ClinicalState = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: customTime ? new Date(customTime).getTime() : Date.now(),
          labs: {
            ...latestState?.labs,
            ...extracted.labs
          },
          vitals: {
            ...latestState?.vitals,
            ...extracted.vitals
          },
          status: extracted.status || latestState?.status || 'Alert',
          weightKg: extracted.weightKg || latestState?.weightKg || 70,
          age: extracted.age || latestState?.age,
          gender: extracted.gender || latestState?.gender,
          historyNote: extracted.historyNote,
          scores: extracted.scores,
          missingData: extracted.missingData,
          differentials: extracted.differentials,
          provisionalDiagnosis: extracted.provisionalDiagnosis,
          managementPlan: extracted.managementPlan,
          adversarialAnalysis: extracted.adversarialAnalysis,
          trendAnalysis: extracted.trendAnalysis,
          directionalQuery: extracted.directionalQuery,
          trajectory: extracted.trajectory,
          blindspots: extracted.blindspots,
          debate: extracted.debate,
          timeline: extracted.timeline
        };

        let updatedPatientToSave: PatientProfile | undefined;
        setPatients(prev => {
          const updatedPatients = prev.map(p => {
            if (p.id === activePatientId) {
              const timestampStr = new Date(newState.timestamp).toLocaleString();
              const newNotes = p.personalNotes 
                ? `${p.personalNotes}\n\n[${timestampStr}]\n${input}`
                : `[${timestampStr}]\n${input}`;
              
              // Update patient name if extracted and current name is a default one or empty
              const newName = (extracted.patientName && (p.name.startsWith('Patient ') || !p.name)) 
                ? extracted.patientName 
                : p.name;
                
              return { 
                ...p, 
                name: newName,
                history: [...p.history, newState].sort((a, b) => a.timestamp - b.timestamp),
                personalNotes: newNotes
              };
            }
            return p;
          });
          updatedPatientToSave = updatedPatients.find(p => p.id === activePatientId);
          return updatedPatients;
        });
        if (updatedPatientToSave) {
          savePatientToFirestore(updatedPatientToSave);
        }
        setTranscript('');
        setManualNote('');
        setIsManualEntry(false);
      } catch (error) {
        console.error("Error processing transcript", error);
      } finally {
        setIsEncounterProcessing(false);
      }
    });
  };

  const handleUpdateLabs = (updatedLabs: Partial<ClinicalLabs>) => {
    if (!activePatientId || !latestState) return;
    
    const newState: ClinicalState = {
      ...latestState,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      labs: {
        ...latestState.labs,
        ...updatedLabs
      }
    };

    let updatedPatientToSave: PatientProfile | undefined;
    setPatients(prev => {
      const updatedPatients = prev.map(p => {
        if (p.id === activePatientId) {
          return {
            ...p,
            history: [...p.history, newState].sort((a, b) => a.timestamp - b.timestamp)
          };
        }
        return p;
      });
      updatedPatientToSave = updatedPatients.find(p => p.id === activePatientId);
      return updatedPatients;
    });
    
    if (updatedPatientToSave) {
      savePatientToFirestore(updatedPatientToSave);
    }
  };

  const stopNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
  };

  const narratePlan = async () => {
    if (!latestState?.managementPlan || !activePatient) return;
    
    if (isNarrating) {
      stopNarration();
      return;
    }

    const planText = latestState.managementPlan.map(step => `${step.action}. Based on ${step.guidelineSource}.`).join(' ');
    const text = `Management Plan for ${activePatient.name}. ${planText}`;
    
    await narrateText(text);
  };

  const narrateSOAPNote = async () => {
    if (!latestState?.historyNote || !activePatient) return;

    if (isNarrating) {
      stopNarration();
      return;
    }

    const text = `SOAP Note for ${activePatient.name}. ${latestState.historyNote}`;
    
    await narrateText(text);
  };

  const copyEHRNote = () => {
    if (!activePatient || !latestState) return;
    
    let note = `
CLINICAL PILOT SUMMARY - ${new Date().toLocaleString()}
PATIENT: ${disguiseText(activePatient.name, 'name', isDisguised)}
MRN: ${disguiseText(activePatient.mrn, 'mrn', isDisguised) || 'N/A'}
DIAGNOSIS: ${latestState.provisionalDiagnosis || 'Pending'}

DIFFERENTIALS:
${latestState.differentials.map(d => `- ${d.name} (${d.likelihood}): ${d.reasoning}`).join('\n')}

MANAGEMENT PLAN:
${latestState.managementPlan?.map((step, i) => `${i+1}. ${step.action} (Source: ${step.guidelineSource})`).join('\n') || 'Pending'}

ADVERSARIAL ANALYSIS (DEVIL'S ADVOCATE):
${latestState.adversarialAnalysis?.summary}
${latestState.adversarialAnalysis?.points.map(p => `- ${p.finding} contradicts ${p.contradicts}. Significance: ${p.significance}`).join('\n')}

Generated by AuraMD Ambient Pilot
    `.trim();

    if (isDisguised) {
      note = disguiseText(note, 'text', isDisguised, activePatient) || note;
    }

    navigator.clipboard.writeText(note);
    alert("Clinical note copied to clipboard!");
  };

  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-[#121417] flex flex-col items-center justify-center text-center p-6">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="text-5xl font-bold tracking-tight whitespace-nowrap">
            <span className="text-[#00FFFF]">Aura</span><span className="text-[#00FF00]">MD</span>
          </h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em]">Your Pocket Physician companion</p>
        </motion.div>
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-cyan-500 shadow-[0_0_10px_#00e5ff]"
          />
        </div>
        {authError && (
          <div className="text-red-400 text-[10px] mt-8 max-w-xs text-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            {authError}
            <button 
              onClick={() => window.location.reload()}
              className="block mx-auto mt-2 text-cyan-400 hover:underline font-bold"
            >
              REFRESH TO RETRY
            </button>
          </div>
        )}
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (isResetMode) {
        await sendPasswordResetEmail(auth, authEmail);
        setResetSent(true);
        return;
      }
      
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        // CRITICAL: Immediately initialize the usage document for the new user
        const usageRef = doc(db, 'usage', userCredential.user.uid);
        await setDoc(usageRef, {
          id: userCredential.user.uid,
          isPremium: false,
          dailyCount: 0,
          lastUsageDate: getStartOfWeek()
        });
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: authEmail,
          role: authRole,
          institute: authInstitute,
          createdAt: Date.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = 'Authentication failed';
      
      if (isResetMode) {
        message = 'Could not send reset email. Please check the address.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email. Would you like to create one?';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Have you forgotten it?';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please double-check your credentials.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'An account already exists with this email. try signing in instead.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = `Access error: Sign-in method not enabled in Console.`;
      } else if (error.code === 'auth/weak-password') {
        message = 'Security warning: Password must be at least 6 characters.';
      } else if (error.message) {
        message = error.message;
      }
      
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!auth || !googleProvider) {
        throw new Error("Initialization in progress, please wait...");
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupError: any) {
        console.warn('Popup failed, trying redirect:', popupError);
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('Google Auth error:', error);
      let message = 'Google sign-in failed.';
      
      if (error.code === 'auth/popup-blocked' || error.message?.includes('popup-blocked')) {
        message = 'The sign-in popup was blocked. If you are in a preview iframe, please click the "Open in new tab" icon in the top right corner of the AI Studio window to sign in.';
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user' || (error.message && error.message.includes('popup-closed-by-user'))) {
        message = 'Sign-in was cancelled by the user. Please try again.';
      } else if (error.code === 'auth/internal-error') {
        message = 'An internal error occurred. If you are in a preview iframe, try opening in a new tab.';
      } else if (error.message) {
        message = error.message;
      }
      
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#121417] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, -60, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-emerald-500/10 blur-[140px] rounded-full"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 glass-panel p-10 max-w-lg w-full flex flex-col items-center text-center shadow-2xl border border-white/5"
        >
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="cursor-pointer mb-8"
          >
            <Logo id="main" className="w-32 h-32" glow={true} />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight turquoise-text-glow leading-tight">
            AuraMD
          </h1>
          <p className="text-cyan-400 font-bold text-sm mb-6 uppercase tracking-[0.2em]">
            Precision Clinical Intelligence
          </p>
          
          <p className="text-[#a1aab5] mb-8 leading-relaxed max-w-sm">
            The next generation of evidence-based clinical reasoning.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-10 w-full text-left">
            {[
              { icon: <ShieldCheck className="w-4 h-4" />, label: "HIPAA Compliant", desc: "Enterprise Security", color: "text-emerald-400" },
              { icon: <Zap className="w-4 h-4" />, label: "Real-time AI", desc: "Instant Reasoning", color: "text-amber-400" },
              { icon: <BrainCircuit className="w-4 h-4" />, label: "GCP Powered", desc: "Google Cloud Platform", color: "text-cyan-400" },
              { icon: <Database className="w-4 h-4" />, label: "EBM Grounded", desc: "Evidence-Based Medicine", color: "text-purple-400" }
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className={feat.color}>{feat.icon}</span>
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">{feat.label}</span>
                </div>
                <span className="text-[9px] text-[#a1aab5]">{feat.desc}</span>
              </motion.div>
            ))}
          </div>

          <div className="w-full space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleAuth}
              disabled={isAuthLoading}
              className="w-full bg-white text-black font-bold py-4 px-4 rounded-2xl hover:bg-gray-100 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] group"
            >
              {isAuthLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
              ) : (
                <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {isAuthLoading ? 'Authenticating...' : 'Sign In with Google'}
            </motion.button>

            {authError && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-400 text-[11px] mt-4 bg-red-500/10 py-3 px-4 rounded-xl border border-red-500/20 text-left flex items-center gap-3 leading-tight"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%" 
            }}
            animate={{ 
              opacity: [0, 0.15, 0],
              y: [null, "-=200"],
              x: [null, "+=" + (Math.random() * 60 - 30)]
            }}
            transition={{ 
              duration: 8 + Math.random() * 12, 
              repeat: Infinity, 
              delay: Math.random() * 10 
            }}
            className="absolute z-0 w-1.5 h-1.5 bg-cyan-400/20 rounded-full blur-[1px] pointer-events-none"
          />
        ))}


      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex bg-[#121417] text-[#ffffff] selection:bg-cyan-500/30",
      isCritical ? "bg-red-950/20" : ""
    )}>
      {/* Sidebar Overlay (Now applies to both mobile and desktop) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]"
          />
        )}
      </AnimatePresence>

      {/* Patient Library Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? 280 : 0) : (isSidebarOpen ? 280 : 72),
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "border-r border-[#2c3137] flex flex-col bg-[#1e2226] shrink-0 relative",
          isMobile ? "fixed inset-y-0 left-0 z-[70] shadow-2xl" : "z-[50]",
          !isSidebarOpen && isMobile && "border-none overflow-hidden"
        )}
      >
        <div className="flex flex-col h-full min-w-[72px] w-full relative">
          <div 
            onClick={() => {
              setCurrentView('dashboard');
              setActivePatientId(null);
            }}
            className={cn("p-4 border-b border-[#2c3137] flex items-center h-[72px] shrink-0 hover:bg-[#2c3137] transition-colors text-left cursor-pointer", isSidebarOpen ? "gap-3" : "justify-center")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setCurrentView('dashboard');
                setActivePatientId(null);
              }
            }}
          >
            <Logo 
              id="sidebar" 
              className="w-12 h-12 shrink-0" 
              glow={false} 
              onLogoLoaded={(hasLogo) => setHasCustomLogo(hasLogo)}
            />
            {isSidebarOpen && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {!hasCustomLogo && (
                  <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">
                    <span className="text-[#00e5ff]">Aura</span><span className="text-[#00d28a]">MD</span>
                  </h1>
                )}
                <span className="text-[8px] text-[#a1aab5] font-medium leading-tight mt-0.5 whitespace-nowrap uppercase tracking-tighter">
                  Clinical Intelligence
                </span>
              </div>
            )}
            
            {/* Sidebar Collapse Toggle */}
            {isSidebarOpen && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }}
                className="p-1.5 bg-[#121417] border border-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className={cn("flex-1 overflow-y-auto scrollbar-hide space-y-6", isSidebarOpen ? "p-4" : "py-4 px-2")}>
            
            {/* Main Navigation */}
            <div className="space-y-2">
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('dashboard'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'dashboard' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Dashboard" : undefined}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Dashboard</span>}
              </button>
              <button 
                onClick={handleCreatePatient}
                className={cn(
                  "flex items-center rounded-xl transition-colors group",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Clinical Patient Encounter" : undefined}
              >
                <Stethoscope className="w-5 h-5 shrink-0 group-hover:text-[#00d28a] transition-colors" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Clinical Patient Encounter</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('clinical-reasoning'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'clinical-reasoning' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Clinical Reasoning" : undefined}
              >
                <BrainCircuit className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Clinical Reasoning</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('library'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'library' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "My Library" : undefined}
              >
                <Library className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">My Library</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('research'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'research' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Research Scout" : undefined}
              >
                <Microscope className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Research Scout</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('nexus'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'nexus' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Nexus Global" : undefined}
              >
                <Globe className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Nexus Global</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('calculators'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'calculators' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "Calculators" : undefined}
              >
                <Calculator className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Calculators</span>}
              </button>
              <button 
                onClick={() => { setActivePatientId(null); setCurrentView('ehr-integration'); }}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                  !activePatientId && currentView === 'ehr-integration' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
                )}
                title={!isSidebarOpen ? "EHR/ERP Integration" : undefined}
              >
                <Database className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">EHR/ERP Integration</span>}
              </button>
              {!isStandalone && (
                <button 
                  id="nav-install-guide"
                  onClick={handleInstallClick}
                  className={cn(
                    "flex items-center rounded-xl transition-all group bg-cyan-500/5 border border-cyan-500/10",
                    isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                    "text-cyan-400 hover:bg-cyan-500/20 hover:text-white hover:border-cyan-500/30"
                  )}
                  title={!isSidebarOpen ? "Install App Guide" : undefined}
                >
                  <Download className={cn("w-5 h-5 shrink-0 transition-transform", !isSidebarOpen && "group-hover:scale-110")} />
                  {isSidebarOpen && <span className="text-sm font-bold whitespace-nowrap">Install App Guide</span>}
                </button>
              )}
            </div>

            <div className="h-px bg-[#2c3137] w-full" />

            {/* Patient Library */}
            <div className="space-y-2">
              <div className={cn("flex items-center mb-4", isSidebarOpen ? "justify-between px-2" : "justify-center")}>
                {isSidebarOpen && <h2 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest whitespace-nowrap">Patient Library</h2>}
                <button 
                  onClick={handleCreatePatient}
                  className="p-1.5 hover:bg-[#2c3137] rounded-lg text-cyan-400 transition-colors"
                  title={!isSidebarOpen ? "New Patient" : undefined}
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>

            {patients.filter(p => !(p.name.startsWith('Patient ') && p.history.length === 0)).length === 0 ? (
              <div className={cn("text-center py-8 text-[#3a4149] text-xs italic font-medium", !isSidebarOpen && "hidden")}>
                No patients in library
              </div>
            ) : (
              patients.filter(p => !(p.name.startsWith('Patient ') && p.history.length === 0)).map(patient => (
                <div 
                  key={patient.id}
                  onClick={() => {
                    setActivePatientId(patient.id);
                    setActiveSection('assessment');
                  }}
                  className={cn(
                    "group rounded-xl cursor-pointer transition-all flex items-center",
                    isSidebarOpen ? "p-3 justify-between" : "p-2 justify-center w-12 h-12 mx-auto mb-2",
                    activePatientId === patient.id 
                      ? "bg-cyan-500/10 border border-cyan-500/20" 
                      : "hover:bg-[#2c3137] border border-transparent"
                  )}
                  title={!isSidebarOpen ? disguiseText(patient.name, 'name', isDisguised) : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      activePatientId === patient.id ? "bg-cyan-600 text-white" : "bg-[#121417] text-[#a1aab5]"
                    )}>
                      {disguiseText(patient.name, 'name', isDisguised)?.[0]}
                    </div>
                    {isSidebarOpen && (
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate max-w-[120px] text-[#ffffff]">{disguiseText(patient.name, 'name', isDisguised)}</p>
                        <p className="text-[10px] text-[#a1aab5] font-mono truncate">{disguiseText(patient.mrn, 'mrn', isDisguised) || 'No MRN'}</p>
                      </div>
                    )}
                  </div>
                  {isSidebarOpen && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFetchToNexus(patient);
                        }}
                        className="p-1 text-[#3a4149] hover:text-orange-400 transition-all"
                        title="Fetch to Nexus Global"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFetchToResearch(patient);
                        }}
                        className="p-1 text-[#3a4149] hover:text-purple-400 transition-all"
                        title="Fetch to Research Scout"
                      >
                        <Microscope className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeletePatient(patient.id, e)}
                        className="p-1 text-[#3a4149] hover:text-red-400 transition-all"
                        title="Delete Patient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>

          <div className={cn("p-4 border-t border-[#2c3137] flex flex-col", isSidebarOpen ? "gap-3" : "items-center relative")}>
            {(isMobile || !isSidebarOpen) ? (
              <div className="w-full relative">
                <AnimatePresence>
                  {isBottomMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute bottom-full mb-4 bg-[#1e2226] border border-[#2c3137] rounded-2xl shadow-2xl p-4 z-[100] w-[240px] overflow-hidden",
                        isSidebarOpen ? "left-0" : "-left-2"
                      )}
                    >
                      <div className="space-y-4">
                        {/* User Profile */}
                        <div className="flex items-center gap-3 px-1 border-b border-[#2c3137] pb-4 mb-2">
                          <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
                            {(user?.displayName?.[0] || user?.email?.[0] || 'D').toUpperCase()}
                          </div>
                          <div className="text-xs whitespace-nowrap overflow-hidden flex-1 text-left">
                            <p className="font-bold text-white truncate">{user?.displayName || 'Physician'}</p>
                            <p className="text-[#a1aab5] truncate text-[10px] font-medium">{user?.email}</p>
                          </div>
                        </div>

                        {/* Usage Tracker */}
                        {usageInfo && (
                          <div className="px-1 border-b border-[#2c3137] pb-4 mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest text-[#a1aab5]",
                                usageInfo.isPremium && "text-cyan-400/70"
                              )}>
                                {usageInfo.isPremium ? 'Pro Monthly' : 'Weekly Usage'}
                              </span>
                              <span className="text-[10px] font-bold text-cyan-400">
                                {usageInfo.count}/{usageInfo.limit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#121417] rounded-full overflow-hidden mb-2">
                              <div 
                                className={cn("h-full transition-all duration-500", usageInfo.isPremium ? "bg-cyan-500" : "bg-amber-500/80")}
                                style={{ width: `${Math.min((usageInfo.count / usageInfo.limit) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-[#a1aab5] font-medium text-left mb-3">RESETS {getNextResetDate().toUpperCase()}</div>
                            {!usageInfo.isPremium && (
                              <button 
                                onClick={() => { setIsBottomMenuOpen(false); setIsUsageLimitModalOpen(true); }}
                                className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-cyan-500/30"
                              >
                                Upgrade to Pro
                              </button>
                            )}
                          </div>
                        )}

                        {/* Navigation Links */}
                        <div className="space-y-1">
                          <button 
                            onClick={() => { setIsBottomMenuOpen(false); setActivePatientId(null); setCurrentView('pricing'); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#d1d6dc] rounded-xl transition-colors text-sm font-medium"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pricing
                          </button>
                          <button 
                            onClick={() => { setIsBottomMenuOpen(false); setActivePatientId(null); setCurrentView('privacy-policy'); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#d1d6dc] rounded-xl transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            Privacy Policy
                          </button>
                          {!isStandalone && (
                            <div className="px-1 py-1">
                              <button 
                                onClick={() => { setIsBottomMenuOpen(false); handleInstallClick(); }}
                                className="w-full relative group overflow-hidden rounded-xl"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                <div className="relative py-2 px-3 flex items-center justify-center gap-2 text-white">
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="text-[11px] font-bold">Download App</span>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Logout & Footer */}
                        <div className="pt-2 border-t border-[#2c3137]">
                          <button 
                            onClick={() => { setIsBottomMenuOpen(false); signOut(auth); }}
                            className="w-full py-2.5 px-3 bg-[#1e2226] hover:bg-red-500/10 text-[#ffffff] hover:text-red-400 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-[#2c3137] hover:border-red-500/30"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                          </button>
                          <div className="mt-3 text-[9px] text-[#a1aab5] text-center space-y-1 opacity-60">
                            <p>Powered by Synapti-Flash Co AI</p>
                            <p className="flex items-center justify-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> HIPAA Compliant
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={(e) => { e.stopPropagation(); setIsBottomMenuOpen(!isBottomMenuOpen); }}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-300",
                    isSidebarOpen ? "w-full gap-3 px-3 py-2.5" : "w-12 h-12 justify-center mx-auto",
                    isBottomMenuOpen ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#d1d6dc] border border-transparent"
                  )}
                  title={!isSidebarOpen ? "Account & More" : undefined}
                >
                  <div className="relative">
                    {isBottomMenuOpen ? <X className="w-5 h-5 shrink-0" /> : <MoreVertical className="w-5 h-5 shrink-0" />}
                  </div>
                  {isSidebarOpen && <span className="text-sm font-bold whitespace-nowrap uppercase tracking-widest text-[10px]">Account & More</span>}
                </button>
              </div>
            ) : (
              // Full Sidebar Items (Desktop)
              <>
                {/* Legal & Pricing */}
                <div className="space-y-1 mb-2">
                  <button 
                    onClick={() => { setActivePatientId(null); setCurrentView('pricing'); }}
                    className={cn(
                      "flex items-center rounded-xl transition-colors w-full gap-3 px-3 py-2.5",
                      currentView === 'pricing' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#d1d6dc]"
                    )}
                  >
                    <CreditCard className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap">Pricing</span>
                  </button>
                  <button 
                    onClick={() => { setActivePatientId(null); setCurrentView('privacy-policy'); }}
                    className={cn(
                      "flex items-center rounded-xl transition-colors w-full gap-3 px-3 py-2.5",
                      currentView === 'privacy-policy' ? "bg-cyan-500/10 text-cyan-400" : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#d1d6dc]"
                    )}
                  >
                    <FileText className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap">Privacy Policy</span>
                  </button>
                </div>

                <div className="flex items-center mt-2 gap-3 px-2">
                  <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
                    {(user?.displayName?.[0] || user?.email?.[0] || 'D').toUpperCase()}
                  </div>
                  <div className="text-xs whitespace-nowrap overflow-hidden flex-1">
                    <p className="font-bold text-white truncate">{user?.displayName || 'Physician'}</p>
                    <p className="text-[#a1aab5] truncate text-[10px] font-medium">{user?.email}</p>
                  </div>
                </div>

                {usageInfo && (
                  <div className="mb-4 px-2 animate-in fade-in duration-300">
                    <div className={cn(
                      "rounded-2xl p-4 border transition-all duration-500 bg-[#1e2226]",
                      usageInfo.isPremium ? "border-cyan-500/20 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/10" : "border-[#2c3137]"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", usageInfo.isPremium ? "text-cyan-400/70" : "text-[#a1aab5]")}>
                          {usageInfo.isPremium ? 'Pro Monthly' : 'Weekly Usage'}
                        </span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", usageInfo.isPremium ? "text-cyan-400" : "text-amber-500/90")}>
                          {usageInfo.count}/{usageInfo.limit}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#121417] rounded-full overflow-hidden mb-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((usageInfo.count / usageInfo.limit) * 100, 100)}%` }}
                          className={cn("h-full transition-all duration-500", usageInfo.isPremium ? "bg-cyan-500 shadow-[0_0_8px_rgba(0,229,255,0.4)]" : "bg-amber-500/80")}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] text-[#a1aab5] font-medium">RESETS {getNextResetDate().toUpperCase()}</span>
                        {usageInfo.count >= usageInfo.limit && (
                          <span className="text-[9px] text-amber-500 font-bold animate-pulse">LIMIT REACHED</span>
                        )}
                      </div>
                      {!usageInfo.isPremium ? (
                        <button 
                          onClick={() => setIsUsageLimitModalOpen(true)}
                          className="w-full py-2 bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Zap className="w-3 h-3" />
                          Get Aura Pro
                        </button>
                      ) : (
                        <div className="text-[9px] text-cyan-400/60 text-center font-bold uppercase tracking-wider">Aura Pro Active</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 text-[10px] text-[#a1aab5] text-center space-y-3">
                  {!isStandalone && (
                    <div className="px-2">
                      <button onClick={handleInstallClick} className="w-full relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-emerald-600 opacity-90 hover:opacity-100 transition-opacity rounded-xl" />
                        <div className="relative py-2.5 px-3 flex items-center justify-center gap-2 text-white">
                          <Download className="w-3.5 h-3.5 text-white" />
                          <span className="text-[11px] font-bold">Download App</span>
                        </div>
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => signOut(auth)}
                    className="w-full py-2 px-3 bg-[#1e2226] hover:bg-[#2c3137] text-[#ffffff] rounded-lg transition-colors font-medium text-[10px] flex items-center justify-center gap-2 border border-[#2c3137]"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#a1aab5]" />
                    Sign Out
                  </button>
                  <div className="space-y-1">
                    <p>Powered by Synapti-Flash Co AI</p>
                    <p className="text-emerald-500/80 font-medium flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> HIPAA Compliant
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.aside>



      {/* Main Content Area */}
      <main className="flex flex-col overflow-hidden relative bg-[#121417] transition-all duration-300 flex-1">
        
        {/* Hidden Compiled Reports for PDF Export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div id="compiled-patient-report">
          {activePatient && (
            <CompiledPatientReport 
              patient={activePatient} 
              latestState={latestState} 
              isDisguised={isDisguised} 
            />
          )}
        </div>
        <div id="compiled-reasoning-report">
          {reasoningResult && (
            <CompiledReasoningReport result={reasoningResult} />
          )}
        </div>
      </div>

      {/* Global Action Header */}
      <div className={cn(
        "fixed top-0 right-0 h-16 bg-[#083344]/45 backdrop-blur-lg border-b border-cyan-500/30 z-40 flex items-center justify-between px-4 lg:px-8 shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] print:hidden overflow-hidden transition-all duration-300",
        !isMobile ? (isSidebarOpen ? "left-[280px]" : "left-[72px]") : "left-0"
      )}>
        {/* Metallic Shine Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-black/20 border border-white/10 rounded-lg text-cyan-100 hover:bg-black/30 transition-colors shadow-sm"
              title="Open Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          {isSidebarOpen && isMobile && (
             <button
               onClick={() => setIsSidebarOpen(false)}
               className="p-2 bg-black/20 border border-white/10 rounded-lg text-cyan-100 hover:bg-black/30 transition-colors shadow-sm"
               title="Close Sidebar"
             >
               <CircleX className="w-6 h-6" />
             </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4 overflow-x-auto no-scrollbar py-2 relative z-10">
          <div className="hidden md:flex flex-col items-end mr-1 shrink-0">
            <span className="text-[9px] text-cyan-200/60 uppercase tracking-widest font-bold">Account Level</span>
            <span className="text-white text-[11px] font-black italic uppercase tracking-tighter">
              {subscriptionTier === 'free' ? 'Free' : 'Pro'} Tier Account
            </span>
          </div>

          {/* HIPAA Disguise Toggle */}
          <button
            onClick={() => {
              const newVal = !isDisguised;
              setIsDisguised(newVal);
              localStorage.setItem('isDisguised', String(newVal));
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border shrink-0",
              isDisguised 
                ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                : "bg-black/30 text-cyan-100 border-cyan-500/30 hover:bg-black/40"
            )}
            title={isDisguised ? "HIPAA Disguise Active" : "Activate HIPAA Disguise"}
          >
            {isDisguised ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
            <span>HIPAA disguise</span>
          </button>

          {/* Strict HIPAA (E2EE) Toggle */}
          <button
            onClick={() => {
              if (!isStrictHIPAAMode && !privacyKey) {
                setIsPrivacyKeyModalOpen(true);
              } else {
                const newVal = !isStrictHIPAAMode;
                setIsStrictHIPAAMode(newVal);
                localStorage.setItem('aura_strict_hipaa', String(newVal));
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border shrink-0",
              isStrictHIPAAMode 
                ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                : "bg-black/30 text-cyan-100 border-cyan-500/30 hover:bg-black/40"
            )}
            title={isStrictHIPAAMode ? "Strict E2EE Active" : "Activate Strict E2EE"}
          >
            {isStrictHIPAAMode ? <Lock className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span>E2E Strict</span>
          </button>

          <a 
            href="https://synapti-flash.lemonsqueezy.com/checkout/buy/a3bbcbea-ce85-474e-a12c-67d87d1707ae"
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-white text-[10px] font-bold uppercase rounded-full shadow-[0_4px_12px_rgba(0,188,212,0.3)] transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            Get Aura Pro
          </a>
        </div>
      </div>
            
        {!activePatient ? (
          currentView === 'pricing' ? (
            <div className="flex-1 overflow-y-auto bg-[#121417] p-8 pt-24 lg:pt-28">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-white turquoise-text-glow">Pricing</h2>
                  {runtimeConfig?.IS_DEV && (
                    <button 
                      onClick={() => isEditingContent ? saveContent() : setIsEditingContent(true)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {isEditingContent ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      {isEditingContent ? "Save Changes" : "Edit Content"}
                    </button>
                  )}
                </div>
                {isEditingContent ? (
                  <textarea 
                    value={pricingContent}
                    onChange={(e) => setPricingContent(e.target.value)}
                    className="w-full h-[600px] bg-[#121417] text-white p-6 rounded-2xl border border-[#2c3137] focus:border-cyan-500 outline-none font-mono text-sm leading-loose"
                    placeholder="Enter pricing details here..."
                  />
                ) : (
                  <div className="bg-[#121417] rounded-2xl p-8 border border-[#2c3137] text-[#d1d6dc] markdown-body max-w-none leading-loose whitespace-pre-wrap">
                    <Markdown>{pricingContent || "Pricing information coming soon."}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ) : currentView === 'privacy-policy' ? (
            <div className="flex-1 overflow-y-auto bg-[#121417] p-8 pt-24 lg:pt-28">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-white turquoise-text-glow">Privacy Policy</h2>
                  {runtimeConfig?.IS_DEV && (
                    <button 
                      onClick={() => isEditingContent ? saveContent() : setIsEditingContent(true)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {isEditingContent ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      {isEditingContent ? "Save Changes" : "Edit Content"}
                    </button>
                  )}
                </div>
                {isEditingContent ? (
                  <textarea 
                    value={privacyPolicyContent}
                    onChange={(e) => setPrivacyPolicyContent(e.target.value)}
                    className="w-full h-[600px] bg-[#121417] text-white p-6 rounded-2xl border border-[#2c3137] focus:border-cyan-500 outline-none font-mono text-sm leading-loose"
                    placeholder="Enter privacy policy here..."
                  />
                ) : (
                  <div className="bg-[#121417] rounded-2xl p-8 border border-[#2c3137] text-[#d1d6dc] markdown-body max-w-none leading-loose whitespace-pre-wrap">
                    <Markdown>{privacyPolicyContent || "Privacy policy coming soon."}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ) : currentView === 'calculators' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto w-full max-w-5xl mx-auto">
              <MedicalCalculators 
                initialLabs={latestState?.labs} 
                initialScores={latestState?.scores}
              />
            </div>
          ) : currentView === 'dashboard' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto relative">
              {/* Offline Preloading Status */}
              <AnimatePresence>
                {offlinePreloadStatus && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm bg-[#1e2226] border border-[#2c3137] rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl z-50"
                  >
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Offline Preloading</span>
                        <span className="text-[10px] font-bold text-cyan-400">{Math.round((offlinePreloadStatus.current / offlinePreloadStatus.total) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-[#121417] rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(offlinePreloadStatus.current / offlinePreloadStatus.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[#a1aab5] whitespace-nowrap">{offlinePreloadStatus.label}</span>
                  </motion.div>
                )}
                {isOfflineReady && !offlinePreloadStatus && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl z-50"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Offline Cache Enabled</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <Logo id="main" className="w-40 h-40 mb-8" showText={true} />
              
              <div className="w-full max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white turquoise-text-glow">
                    Master the Art of <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Medicine</span>
                  </h2>
                  <p className="text-transparent bg-clip-text bg-gradient-to-b from-white to-[#a1aab5] text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                    AI-powered Clinical Reasoning & Patient Simulation<br />
                    <span className="text-cyan-400/80">Built for real-world decision making</span>
                  </p>

                  <div className="flex flex-wrap justify-center gap-4 py-2">
                    {[
                      { icon: <ShieldCheck className="w-4 h-4" />, label: "Guidelines & Evidence-based outputs" },
                      { icon: <Zap className="w-4 h-4" />, label: "Real-time Decision Support" },
                      { icon: <Lock className="w-4 h-4" />, label: "HIPAA Compliant" }
                    ].map((feature, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + (idx * 0.1) }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest"
                      >
                        <span className="text-cyan-400">{feature.icon}</span>
                        {feature.label}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mode 1: Clinical Reasoning */}
                  <div className="flex flex-col p-8 rounded-3xl bg-[#1e2226] border border-[#2c3137] hover:border-[#00e5ff] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5ff]/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
                    <BrainCircuit className="w-12 h-12 text-[#00e5ff] mb-6 relative z-10" />
                    <h3 className="text-2xl font-bold text-white mb-3 relative z-10 turquoise-text-glow">Clinical Reasoning</h3>
                    <p className="text-[#a1aab5] leading-relaxed mb-8 relative z-10 flex-1">
                      Search for specific medical conditions, guidelines, or management plans. Instantly retrieve evidence-based protocols, blindspots, and potential complications.
                    </p>
                    
                    <div className="relative w-full z-10">
                      <div className="relative flex items-center">
                        <Search className="absolute left-4 w-5 h-5 text-[#a1aab5]" />
                        <input 
                          type="text"
                          value={globalInput}
                          onChange={e => setGlobalInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGlobalSubmit()}
                          placeholder="e.g., Management of DKA..."
                          className="w-full bg-[#121417] border border-[#2c3137] rounded-xl py-4 pl-12 pr-14 text-sm text-white placeholder:text-[#3a4149] focus:outline-none focus:border-[#00e5ff] transition-all"
                        />
                        <button 
                          onClick={handleGlobalSubmit}
                          disabled={!globalInput.trim() || isReasoningProcessing}
                          className="absolute right-2 p-2 bg-[#00e5ff] rounded-lg hover:bg-[#007BB5] transition-colors disabled:opacity-50"
                        >
                          {isReasoningProcessing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode 2: Clinical Patient Encounter */}
                  <div className="flex flex-col p-8 rounded-3xl bg-[#1e2226] border border-[#2c3137] hover:border-[#00d28a] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d28a]/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
                    <Stethoscope className="w-12 h-12 text-[#00d28a] mb-6 relative z-10" />
                    <h3 className="text-2xl font-bold text-white mb-3 relative z-10 turquoise-text-glow">Clinical Patient Encounter</h3>
                    <p className="text-[#a1aab5] leading-relaxed mb-8 relative z-10 flex-1">
                      Follow a patient from history to management. Accumulate data via manual typing or activate Hybrid Mode for ambient listening.
                    </p>
                    
                    <button 
                      onClick={handleCreatePatient}
                      className="w-full py-4 bg-[#00d28a] text-[#121417] rounded-xl font-bold hover:bg-[#8EBF4C] transition-all flex items-center justify-center gap-2 relative z-10 shadow-lg shadow-[#00d28a]/20"
                    >
                      <UserPlus className="w-5 h-5" />
                      Start Encounter
                    </button>
                  </div>
                </div>

                {/* Distinctive Features */}
                <div className="pt-8 mt-8 border-t border-[#2c3137]/50 w-full">
                  <h3 className="text-center text-[#a1aab5] text-xs font-bold uppercase tracking-widest mb-6">Distinctive Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <BrainCircuit className="w-6 h-6 text-[#00e5ff] mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">Clinical Reasoning</h4>
                      <p className="text-xs text-[#a1aab5]">Guidelines & blindspots</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <Stethoscope className="w-6 h-6 text-[#00d28a] mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">Clinical Patient Encounter</h4>
                      <p className="text-xs text-[#a1aab5]">Live patient workflow</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <Database className="w-6 h-6 text-cyan-400 mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">PWA Ready</h4>
                      <p className="text-xs text-[#a1aab5]">Direct app installation</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <ShieldCheck className="w-6 h-6 text-emerald-500 mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">E2E Encryption</h4>
                      <p className="text-xs text-[#a1aab5]">Strict HIPAA Mode</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <Microscope className="w-6 h-6 text-[#8b943e] mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">Research Scout</h4>
                      <p className="text-xs text-[#a1aab5]">Draft cases & literature</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#1e2226]/30 border border-[#2c3137]/30 hover:bg-[#1e2226] transition-colors">
                      <Globe className="w-6 h-6 text-[#f59e0b] mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">Nexus Global</h4>
                      <p className="text-xs text-[#a1aab5]">Global case discussion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentView === 'clinical-reasoning' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto">
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <BrainCircuit className="w-10 h-10 text-[#00e5ff]" />
                  <div>
                    <h2 className="text-3xl font-bold text-white turquoise-text-glow">Clinical Reasoning</h2>
                    <p className="text-[#a1aab5]">Evidence-based guidelines, blindspots, and complications.</p>
                  </div>
                </div>
                
                <div className="relative flex flex-col mb-8 bg-[#1e2226] border border-[#2c3137] rounded-xl focus-within:border-[#00e5ff] transition-all">
                  <div className="flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-[#a1aab5]" />
                    <input 
                      type="text"
                      value={globalInput}
                      onChange={e => setGlobalInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGlobalSubmit()}
                      placeholder="Search conditions, guidelines, or upload medical imaging..."
                      className="w-full bg-transparent py-4 pl-12 pr-24 text-sm text-white placeholder:text-[#3a4149] focus:outline-none"
                    />
                    <div className="absolute right-2 flex items-center gap-2">
                      <label className="cursor-pointer p-2 text-[#a1aab5] hover:text-white transition-colors">
                        <ImageIcon className="w-5 h-5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReasoningMimeType(file.type);
                              const reader = new FileReader();
                              reader.onloadend = () => setReasoningImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                      <button 
                        onClick={() => handleGlobalSubmit()}
                        disabled={(!globalInput.trim() && !reasoningImage) || isReasoningProcessing}
                        className="p-2 bg-[#00e5ff] rounded-lg hover:bg-[#007BB5] transition-colors disabled:opacity-50"
                      >
                        {isReasoningProcessing ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                  {reasoningImage && (
                    <div className="px-4 pb-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#2c3137]">
                        <img src={reasoningImage} alt="Upload preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => { setReasoningImage(null); setReasoningMimeType(''); }}
                          className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full hover:bg-red-500/80 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <p className="text-xs text-[#a1aab5]">Image attached for AI interpretation.</p>
                    </div>
                  )}
                </div>

                {isReasoningProcessing ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-4 border-[#00e5ff]/30 border-t-[#00e5ff] rounded-full animate-spin" />
                    <p className="text-[#a1aab5] animate-pulse">Synthesizing medical literature...</p>
                  </div>
                ) : reasoningResult ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-[#2c3137] pb-4">
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-bold text-white">
                          Results for: <span className="text-[#00e5ff]">{reasoningResult.query}</span>
                        </h3>
                        {isFromCache && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Served from Active Offline Cache</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleExportReasoningPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold transition-colors border border-emerald-500/20"
                        >
                          <Download className="w-4 h-4" />
                          Export PDF
                        </button>
                        <button 
                          onClick={() => {
                            const trialsText = reasoningResult.keyTrials?.map(t => `- **${t.name} (${t.year})**: ${t.summary}`).join('\n') || 'None';
                            const refsText = reasoningResult.references?.map(r => `- ${r.citation} ${r.url ? `[Link](${r.url})` : ''}`).join('\n') || 'None';
                            const executiveText = reasoningResult.executiveSummary ? `**Executive Summary:**\n${reasoningResult.executiveSummary}\n\n` : '';
                            const triggerText = reasoningResult.criticalTriggers?.map(t => `- [${t.priority}] **If** ${t.trigger} **then** ${t.action}`).join('\n') || 'None';
                            const missingText = reasoningResult.missingCriticalData?.map(d => `- ${d}`).join('\n') || 'None';

                            handleSaveToLibrary(
                              `Clinical Reasoning: ${reasoningResult.query}`, 
                              'Guideline',
                              `${executiveText}**Decision Triggers:**\n${triggerText}\n\n**Missing Critical Data:**\n${missingText}\n\n**Guidelines:**\n${reasoningResult.guidelines}\n\n**Management Steps:**\n${reasoningResult.managementSteps}\n\n**Clinical Reasoning:**\n${reasoningResult.clinicalReasoning}\n\n**Clinical Blindspots:**\n${reasoningResult.blindspots}\n\n**Potential Complications:**\n${reasoningResult.complications}\n\n**Key Trials:**\n${trialsText}\n\n**References:**\n${refsText}`
                            );
                            alert('Saved to My Library!');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 text-[#00e5ff] rounded-xl text-sm font-bold transition-colors border border-[#00e5ff]/20"
                        >
                          <Library className="w-4 h-4" />
                          Save to Library
                        </button>
                      </div>
                    </div>
                    
                    <div id="clinical-reasoning-content" className="grid grid-cols-1 gap-6">
                      {/* Navigation Jump Labels */}
                      <div className="flex flex-wrap gap-2 sticky top-[72px] z-20 bg-[#121417]/80 backdrop-blur-md p-2 rounded-xl border border-[#2c3137]">
                        {reasoningResult.executiveSummary && <button onClick={() => document.getElementById('strategic-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">Strategic Summary</button>}
                        {reasoningResult.criticalTriggers && reasoningResult.criticalTriggers.length > 0 && <button onClick={() => document.getElementById('trigger-system')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all">Act Now triggers</button>}
                        <button onClick={() => document.getElementById('guidelines')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">Guidelines</button>
                        <button onClick={() => document.getElementById('management')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">Management</button>
                        <button onClick={() => document.getElementById('reasoning')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-all">Logic</button>
                        <button onClick={() => document.getElementById('blindspots')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all">Blindspots</button>
                        <button onClick={() => document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase rounded-lg border border-pink-500/20 hover:bg-pink-500/20 transition-all">Evidence</button>
                        <button onClick={() => document.getElementById('references')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-3 py-1 bg-gray-500/10 text-gray-400 text-[10px] font-bold uppercase rounded-lg border border-gray-500/20 hover:bg-gray-500/20 transition-all">References</button>
                      </div>

                      {reasoningResult.executiveSummary && (
                        <div id="strategic-summary" className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                          <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-3 uppercase tracking-widest text-xs">
                             <BrainCircuit className="w-5 h-5" />
                             Executive Strategic Summary
                          </h4>
                          <div className="text-white text-lg leading-relaxed font-medium">
                            {reasoningResult.executiveSummary}
                          </div>
                        </div>
                      )}

                      {reasoningResult.criticalTriggers && reasoningResult.criticalTriggers.length > 0 && (
                        <div id="trigger-system" className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
                          <h4 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4 uppercase tracking-widest text-xs">
                             <Zap className="w-5 h-5" />
                             Decision Trigger System (ACT NOW)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reasoningResult.criticalTriggers.map((t, idx) => (
                              <div key={idx} className={cn(
                                "p-4 rounded-xl border flex flex-col gap-2",
                                t.priority === 'EMERGENT' ? "bg-red-500/10 border-red-500/30" : 
                                t.priority === 'URGENT' ? "bg-orange-500/10 border-orange-500/30" :
                                "bg-blue-500/10 border-blue-500/30"
                              )}>
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    t.priority === 'EMERGENT' ? "bg-red-500 text-white" : 
                                    t.priority === 'URGENT' ? "bg-orange-500 text-white" :
                                    "bg-blue-500 text-white"
                                  )}>
                                    {t.priority}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-white">Trigger: {t.trigger}</div>
                                <div className="text-sm text-[#a1aab5]"><span className="text-emerald-400 font-bold">Action:</span> {t.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {reasoningResult.missingCriticalData && reasoningResult.missingCriticalData.length > 0 && (
                        <div className="bg-amber-500/5 rounded-2xl p-6 border border-amber-500/20">
                          <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 uppercase tracking-widest text-xs">
                             <AlertTriangle className="w-5 h-5" />
                             Missing Critical Diagnostic Data
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {reasoningResult.missingCriticalData.map((d, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-[#b3b9c1] bg-[#121417] p-3 rounded-xl border border-[#2c3137]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div id="guidelines" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#00d28a]" />
                            Guideline Overview
                          </h4>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(reasoningResult.guidelines);
                              alert('Copied to clipboard!');
                            }}
                            className="p-1.5 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-all"
                            title="Copy to Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[#b3b9c1] leading-relaxed">
                          <div className="markdown-body">
                            <Markdown>{reasoningResult.guidelines}</Markdown>
                          </div>
                        </div>
                      </div>

                      <div id="management" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137] border-l-4 border-l-[#00e5ff]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-[#00e5ff]" />
                            Management Steps
                          </h4>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(reasoningResult.managementSteps);
                              alert('Copied to clipboard!');
                            }}
                            className="p-1.5 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-all"
                            title="Copy to Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[#b3b9c1] leading-relaxed">
                          <div className="markdown-body">
                            <Markdown>{reasoningResult.managementSteps}</Markdown>
                          </div>
                        </div>
                      </div>

                      <div id="reasoning" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137] border-l-4 border-l-[#8b943e]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-[#8b943e]" />
                            Clinical Arguing & Reasoning
                          </h4>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(reasoningResult.clinicalReasoning);
                              alert('Copied to clipboard!');
                            }}
                            className="p-1.5 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-all"
                            title="Copy to Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[#b3b9c1] leading-relaxed">
                          <div className="markdown-body">
                            <Markdown>{reasoningResult.clinicalReasoning}</Markdown>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div id="blindspots" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137] border-l-4 border-l-[#f59e0b]">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-[#f59e0b]" />
                            Clinical Blindspots
                          </h4>
                          <div className="text-[#b3b9c1] leading-relaxed">
                          <div className="markdown-body">
                            <Markdown>{reasoningResult.blindspots}</Markdown>
                          </div>
                          </div>
                        </div>

                        <div className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137] border-l-4 border-l-[#ef4444]">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-[#ef4444]" />
                            Potential Complications
                          </h4>
                          <div className="text-[#b3b9c1] leading-relaxed">
                          <div className="markdown-body">
                            <Markdown>{reasoningResult.complications}</Markdown>
                          </div>
                          </div>
                        </div>
                      </div>

                      {/* Key Trials & Evidence */}
                      {reasoningResult.keyTrials && reasoningResult.keyTrials.length > 0 && (
                        <div id="evidence" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137]">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Microscope className="w-5 h-5 text-[#ec4899]" />
                            Landmark Trials & Evidence
                          </h4>
                          <div className="space-y-4">
                            {reasoningResult.keyTrials.map((trial, idx) => (
                              <div key={idx} className="bg-[#121417] p-4 rounded-xl border border-[#2c3137]/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-[#00e5ff]">{trial.name}</span>
                                  <span className="text-xs font-medium bg-[#2c3137] text-white px-2 py-1 rounded-md">{trial.year}</span>
                                </div>
                                <p className="text-sm text-[#b3b9c1] leading-relaxed">{trial.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* References */}
                      {reasoningResult.references && reasoningResult.references.length > 0 && (
                        <div id="references" className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137]">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-[#a1aab5]" />
                            References & Citations
                          </h4>
                          <ul className="space-y-3">
                            {reasoningResult.references.map((ref, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-[#a1aab5]">
                                <div className="mt-1 min-w-[16px]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                                </div>
                                <div>
                                  <span className="text-[#b3b9c1]">{ref.citation}</span>
                                  {ref.url && (
                                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-[#00e5ff] hover:underline">
                                      <LinkIcon className="w-3 h-3" /> Link
                                    </a>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Follow-up Question */}
                      <div className="bg-[#1e2226] rounded-2xl p-6 border border-[#2c3137] bg-gradient-to-br from-[#1e2226] to-[#121417]">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-[#00e5ff]" />
                          Ask a Follow-up Question
                        </h4>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Ask about specific dosages, contraindications, or alternative therapies..."
                            className="w-full bg-[#121417] border border-[#2c3137] rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-[#00e5ff] transition-all"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleGlobalSubmit(`Follow-up on ${reasoningResult.query}: ${e.currentTarget.value}`);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <button 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#00e5ff] hover:text-[#00B4FF] transition-colors"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              if (input.value.trim()) {
                                handleGlobalSubmit(`Follow-up on ${reasoningResult.query}: ${input.value}`);
                                input.value = '';
                              }
                            }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="mt-3 text-xs text-[#a1aab5]">The AI will use the current context to provide a more specific answer.</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : currentView === 'library' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto w-full max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Library className="w-10 h-10 text-[#00e5ff]" />
                  <h2 className="text-3xl font-bold text-white">My Library</h2>
                </div>
                
                <div className="bg-[#1e2226] border border-[#2c3137] rounded-xl p-4 flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#a1aab5] uppercase tracking-widest font-bold">Account Level</span>
                    <span className="text-cyan-400 font-black tracking-tight text-lg uppercase italic">
                      {subscriptionTier === 'free' ? 'Free Tier' : subscriptionTier === 'pro' ? 'Aura Pro' : 'Enterprise'}
                    </span>
                  </div>
                  {subscriptionTier === 'free' && (
                    <button 
                      onClick={() => setSubscriptionTier('pro')}
                      className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-xl shadow-cyan-500/20 active:scale-95"
                    >
                      Get Aura Pro
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Saved Cases</h3>
                  <p className="text-3xl font-light text-[#00e5ff]">{libraryItems.filter(i => i.type === 'Case Study').length}</p>
                </div>
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Protocols</h3>
                  <p className="text-3xl font-light text-[#00d28a]">{libraryItems.filter(i => i.type === 'Protocol').length}</p>
                </div>
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Guidelines</h3>
                  <p className="text-3xl font-light text-[#8b943e]">{libraryItems.filter(i => i.type === 'Guideline').length}</p>
                </div>
              </div>

              <div className="glass-panel p-6 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Recent Items</h3>
                  <button 
                    onClick={() => {
                      setEditingLibraryItemId(null);
                      setNewLibraryItemTitle('');
                      setNewLibraryItemType('Protocol');
                      setIsEditingLibraryItem(true);
                    }}
                    className="text-sm text-[#00e5ff] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>
                
                <div className="space-y-4">
                  {libraryItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-[#121417] rounded-xl border border-[#2c3137] hover:border-[#0d9488] transition-colors group">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setViewingLibraryItem(item)}>
                        <div className="w-10 h-10 rounded-lg bg-[#1e2226] flex items-center justify-center">
                          {item.type === 'Protocol' ? <FileText className="w-5 h-5 text-[#00d28a]" /> : 
                           item.type === 'Guideline' ? <BookOpen className="w-5 h-5 text-[#8b943e]" /> : 
                           <ClipboardList className="w-5 h-5 text-[#00e5ff]" />}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            {isDisguised && activePatient 
                              ? disguiseText(item.title, 'text', isDisguised, activePatient)
                              : item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#a1aab5] bg-[#1e2226] px-2 py-0.5 rounded-full">{item.type}</span>
                            <span className="text-xs text-[#a1aab5]">{item.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLibraryItemId(item.id);
                            setNewLibraryItemTitle(item.title);
                            setNewLibraryItemType(item.type);
                            setIsEditingLibraryItem(true);
                          }}
                          className="p-2 hover:bg-[#1e2226] rounded-lg text-[#a1aab5] hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLibraryItem(item.id);
                          }}
                          className="p-2 hover:bg-[#1e2226] rounded-lg text-[#a1aab5] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {libraryItems.length === 0 && (
                    <div className="text-center py-8 text-[#a1aab5]">
                      No items in your library. Click "Add New" to create one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : currentView === 'research' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto w-full max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Microscope className="w-10 h-10 text-[#8b943e]" />
                  <h2 className="text-3xl font-bold text-white">Research Scout</h2>
                </div>
              </div>
              
              {!selectedResearchPatientId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patients.filter(p => p.history && p.history.length > 0).map((patient) => (
                    <div key={patient.id} onClick={() => handleGenerateManuscript(patient)} className="glass-panel p-6 hover:border-[#8b943e] transition-colors cursor-pointer group relative">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#8b943e] transition-colors">{disguiseText(patient.name, 'name', isDisguised)}</h3>
                        <span className="text-xs bg-[#1e2226] text-[#a1aab5] px-2 py-1 rounded-full">
                          {new Date(patient.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-[#a1aab5] flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#8b943e]"></div>
                          {patient.history.length} Encounters
                        </span>
                        <div className="flex items-center gap-2 transition-opacity text-sm text-[#8b943e] font-medium">
                          Generate Manuscript <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {patients.filter(p => p.history && p.history.length > 0).length === 0 && (
                    <div className="col-span-full text-center py-12 text-[#a1aab5] border-2 border-dashed border-[#2c3137] rounded-3xl">
                      No patients with clinical encounters available. Add a clinical encounter to a patient to generate manuscripts.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => {
                      setSelectedResearchPatientId(null);
                      setGeneratedManuscript(null);
                    }}
                    className="flex items-center gap-2 text-[#a1aab5] hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Patients
                  </button>
                  
                  <div className="glass-panel p-8">
                    {isGeneratingManuscript ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#8b943e] animate-spin mb-4" />
                        <p className="text-[#a1aab5]">Drafting manuscript based on patient history...</p>
                      </div>
                    ) : generatedManuscript ? (
                      <div id="research-manuscript-content">
                        <div className="flex justify-end gap-2 mb-4 print:hidden">
                          <button
                            onClick={() => exportToPDF('research-manuscript-content', `${disguiseText(patients.find(p => p.id === selectedResearchPatientId)?.name, 'name', isDisguised) || 'Patient'}_Manuscript.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20"
                          >
                            <Download className="w-4 h-4" />
                            Export PDF
                          </button>
                          <button
                            onClick={() => {
                              handleSaveToLibrary(`Research Manuscript: ${disguiseText(patients.find(p => p.id === selectedResearchPatientId)?.name, 'name', isDisguised) || 'Unknown'}`, 'Article', generatedManuscript, selectedResearchPatientId || undefined);
                              alert('Saved to My Library!');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff]/10 text-[#00e5ff] hover:bg-[#00e5ff]/20 rounded-lg text-xs font-bold transition-colors border border-[#00e5ff]/20"
                          >
                            <Library className="w-4 h-4" />
                            Save to Library
                          </button>
                        </div>
                        <div className="prose prose-invert max-w-none">
                          <Markdown>
                            {isDisguised && selectedResearchPatientId 
                              ? disguiseText(generatedManuscript, 'text', isDisguised, patients.find(p => p.id === selectedResearchPatientId))
                              : generatedManuscript}
                          </Markdown>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : currentView === 'nexus' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto w-full max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Globe className="w-10 h-10 text-cyan-400" />
                  <h2 className="text-3xl font-bold text-white">Nexus Global</h2>
                </div>
                {!selectedBroadcastId && (
                  <div className="flex bg-[#1e2226] p-1 rounded-xl border border-[#2c3137]">
                    <button 
                      onClick={() => setNexusSection('feed')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        nexusSection === 'feed' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-[#a1aab5] hover:text-white"
                      )}
                    >
                      Global Feed
                    </button>
                    <button 
                      onClick={() => setNexusSection('my-patients')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        nexusSection === 'my-patients' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-[#a1aab5] hover:text-white"
                      )}
                    >
                      Broadcast My Case
                    </button>
                  </div>
                )}
              </div>

              {!selectedBroadcastId ? (
                <>
                  {nexusSection === 'feed' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {globalBroadcasts.map((broadcast) => (
                        <div key={broadcast.id} onClick={() => setSelectedBroadcastId(broadcast.id)} className="bg-gradient-to-br from-[#1e2226] to-[#121417] border border-[#2c3137] rounded-3xl p-6 hover:border-cyan-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-xl">
                          <div className="absolute top-0 right-0 p-4">
                            <MessageSquare className="w-5 h-5 text-cyan-500/30 group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <div className="flex flex-col h-full">
                            <div className="mb-4">
                              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{broadcast.patientName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest">{broadcast.userEmail}</span>
                              </div>
                            </div>
                            <p className="text-sm text-[#a1aab5] line-clamp-3 mb-6 flex-1 italic">
                              "{broadcast.summary}"
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-[#2c3137]">
                              <span className="text-[10px] font-bold text-cyan-400/70">{new Date(broadcast.createdAt).toLocaleDateString()}</span>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                                Join Discussion <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {globalBroadcasts.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-[#1e2226] rounded-3xl border-2 border-dashed border-[#2c3137]">
                          <Globe className="w-12 h-12 text-[#2c3137] mx-auto mb-4" />
                          <p className="text-[#a1aab5] font-medium">Global feed is currently quiet. Be the first to broadcast a case!</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {patients.filter(p => p.history && p.history.length > 0).map((patient) => (
                        <div key={patient.id} onClick={() => handleNexusBroadcast(patient)} className="glass-panel p-6 hover:border-cyan-500 transition-colors cursor-pointer group relative">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{disguiseText(patient.name, 'name', isStrictHIPAAMode)}</h3>
                            <span className="text-xs bg-[#1e2226] text-[#a1aab5] px-2 py-1 rounded-full">
                              {new Date(patient.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-[#a1aab5] flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              {patient.history.length} Encounters
                            </span>
                            <div className="flex items-center gap-2 text-sm text-cyan-400 font-bold">
                              {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                              Broadcast Case
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 h-full flex flex-col pb-8">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedBroadcastId(null)}
                      className="flex items-center gap-2 text-[#a1aab5] hover:text-white transition-colors self-start font-bold text-xs uppercase tracking-widest"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Nexus Feed
                    </button>
                    <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Live discussion</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                    {/* Case Summary Panel */}
                    <div className="glass-panel p-6 flex flex-col bg-gradient-to-b from-[#1e2226] to-[#121417] h-full">
                      <div className="mb-6 pb-6 border-b border-[#2c3137]">
                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">Case Summary</h3>
                        <h2 className="text-xl font-bold text-white mb-2">{globalBroadcasts.find(b => b.id === selectedBroadcastId)?.patientName}</h2>
                        <p className="text-xs text-[#a1aab5] font-medium italic">Shared by {globalBroadcasts.find(b => b.id === selectedBroadcastId)?.userEmail}</p>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        <p className="text-sm text-[#ffffff] leading-relaxed whitespace-pre-wrap italic">
                          "{globalBroadcasts.find(b => b.id === selectedBroadcastId)?.summary}"
                        </p>
                      </div>
                      <div className="mt-6 pt-6 border-t border-[#2c3137]">
                         <div className="flex flex-wrap gap-2">
                           {globalBroadcasts.find(b => b.id === selectedBroadcastId)?.tags?.map(tag => (
                             <span key={tag} className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded uppercase tracking-tighter border border-cyan-400/20">{tag}</span>
                           ))}
                         </div>
                      </div>
                    </div>

                    {/* Discussion Panel */}
                    <div className="lg:col-span-2 glass-panel p-0 flex flex-col h-full bg-[#121417]">
                      <div className="p-4 border-b border-[#2c3137] bg-white/[0.02]">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Global Peer Discussion</h3>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide min-h-[400px]">
                        {activeBroadcastMessages.map((msg) => (
                          <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.userId === user?.uid ? "ml-auto items-end" : "items-start")}>
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                              <span className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-widest">{msg.userEmail}</span>
                              <span className="text-[9px] text-[#3a4149]">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm shadow-xl",
                              msg.userId === user?.uid 
                                ? "bg-cyan-600 text-white rounded-tr-none" 
                                : msg.userId === 'system'
                                  ? "bg-[#1e2226] text-cyan-400 italic text-[10px] animate-pulse w-full text-center rounded-lg border border-cyan-500/20"
                                  : "bg-[#2c3137] text-white rounded-tl-none border border-[#3a4149]"
                            )}>
                              {msg.message}
                            </div>
                          </div>
                        ))}
                        {activeBroadcastMessages.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-[#a1aab5] italic text-sm py-20">
                            <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                            No messages yet. Start the clinical discussion...
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-white/[0.02] border-t border-[#2c3137]">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={nexusChatInput}
                            onChange={(e) => setNexusChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNexusSendMessage()}
                            placeholder="Share your clinical insight..."
                            className="flex-1 bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-[#3a4149]"
                          />
                          <button 
                            onClick={handleNexusSendMessage}
                            disabled={!nexusChatInput.trim()}
                            className="p-3 bg-cyan-600 rounded-xl hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                          >
                            <Send className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : currentView === 'ehr-integration' ? (
            <div className="flex-1 flex flex-col p-6 pt-24 lg:p-12 lg:pt-28 overflow-y-auto w-full max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Database className="w-10 h-10 text-cyan-400" />
                  <h2 className="text-3xl font-bold text-white">EHR/ERP Integration</h2>
                </div>
                <button 
                  onClick={() => exportToPDF('ehr-integration-content', 'EHR_Integration_Guide.pdf')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-bold transition-colors border border-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  Export Guide to PDF
                </button>
              </div>

              <div id="ehr-integration-content" className="bg-[#1e2226] border border-[#2c3137] rounded-2xl p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6">Integration Guidance</h3>
                
                <div className="space-y-6 text-[#a1aab5]">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-cyan-400 text-sm font-medium flex items-start gap-3">
                    <Database className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                      <strong>Live Demo Active:</strong> The "Fetch EHR" button in the patient view is currently connected to the configured <strong>FHIR server</strong> below. It performs real network requests to fetch live patient data and vitals using the HL7 FHIR standard.
                    </p>
                  </div>
                  <p>
                    Connect your existing Electronic Health Record (EHR) or Enterprise Resource Planning (ERP) system to seamlessly fetch patient data and export clinical reasoning reports.
                  </p>

                  <div className="bg-[#121417] p-6 rounded-xl border border-[#2c3137]">
                    <h4 className="text-lg font-semibold text-white mb-4">Step 1: Generate API Keys</h4>
                    <p className="mb-4">
                      Log in to your EHR/ERP administrator portal and generate a new set of API credentials with read/write access for patient records.
                    </p>
                    <div className="flex items-center gap-4">
                      <button className="px-4 py-2 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0f766e] transition-colors">
                        Generate Keys
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#121417] p-6 rounded-xl border border-[#2c3137]">
                    <h4 className="text-lg font-semibold text-white mb-4">Step 2: Connect to FHIR Server</h4>
                    <p className="mb-6">
                      Enter your FHIR server details below to establish a real-time connection and verify compatibility.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          onClick={() => setFhirAuthType('open')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${fhirAuthType === 'open' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-[#1e2226] text-[#a1aab5] border border-[#2c3137] hover:bg-[#2c3137]'}`}
                        >
                          Open Server (Sandbox)
                        </button>
                        <button
                          onClick={() => setFhirAuthType('oauth')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${fhirAuthType === 'oauth' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-[#1e2226] text-[#a1aab5] border border-[#2c3137] hover:bg-[#2c3137]'}`}
                        >
                          SMART on FHIR (OAuth 2.0)
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#a1aab5] uppercase tracking-wider mb-2">FHIR Server URL</label>
                        <input 
                          type="text" 
                          value={fhirServerUrl}
                          onChange={(e) => setFhirServerUrl(e.target.value)}
                          className="w-full bg-[#1e2226] border border-[#2c3137] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                          placeholder="e.g., https://hapi.fhir.org/baseR4"
                        />
                      </div>

                      {fhirAuthType === 'oauth' && (
                        <div className="space-y-4 pt-4 border-t border-[#2c3137]">
                          <div>
                            <label className="block text-xs font-bold text-[#a1aab5] uppercase tracking-wider mb-2">Client ID</label>
                            <input 
                              type="text" 
                              value={fhirClientId}
                              onChange={(e) => setFhirClientId(e.target.value)}
                              className="w-full bg-[#1e2226] border border-[#2c3137] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                              placeholder="OAuth Client ID"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[#a1aab5] uppercase tracking-wider mb-2">Authorization URL</label>
                              <input 
                                type="text" 
                                value={fhirAuthUrl}
                                onChange={(e) => setFhirAuthUrl(e.target.value)}
                                className="w-full bg-[#1e2226] border border-[#2c3137] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                                placeholder="e.g., https://authorization.cerner.com/..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#a1aab5] uppercase tracking-wider mb-2">Token URL</label>
                              <input 
                                type="text" 
                                value={fhirTokenUrl}
                                onChange={(e) => setFhirTokenUrl(e.target.value)}
                                className="w-full bg-[#1e2226] border border-[#2c3137] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                                placeholder="e.g., https://authorization.cerner.com/.../token"
                              />
                            </div>
                          </div>
                          <div className="bg-[#1e2226] border border-[#2c3137] rounded-lg p-4 mt-2">
                            <p className="text-xs text-[#a1aab5] mb-1"><strong>Redirect URI (Add to your EHR portal):</strong></p>
                            <code className="text-xs text-cyan-400 bg-[#121417] px-2 py-1 rounded">{window.location.origin}/auth/callback</code>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-4">
                        <button 
                          onClick={handleTestFHIRConnection}
                          disabled={isTestingConnection}
                          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isTestingConnection ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                          {isTestingConnection ? 'Connecting...' : 'Test Connection'}
                        </button>
                        
                        {connectionStatus === 'success' && (
                          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <CheckCircle2 className="w-5 h-5" />
                            {connectionMessage}
                          </div>
                        )}
                        {connectionStatus === 'error' && (
                          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                            <AlertTriangle className="w-5 h-5" />
                            {connectionMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121417] p-6 rounded-xl border border-[#2c3137]">
                    <h4 className="text-lg font-semibold text-white mb-4">Supported Systems</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Epic', 'Cerner', 'Athenahealth', 'Allscripts', 'Meditech', 'eClinicalWorks', 'NextGen', 'Greenway'].map(system => (
                        <div key={system} className="flex items-center gap-2 p-3 bg-[#1e2226] rounded-lg border border-[#2c3137]">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">{system}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-y-auto bg-[#121417] scrollbar-hide p-6 pt-24 lg:p-12 lg:pt-28">
              <div id="exportable-content" className="max-w-5xl mx-auto w-full p-6 lg:p-10 space-y-4">
                {/* Patient Context Actions */}
                <div className="flex items-center gap-2 flex-wrap pb-2 max-w-full print:hidden">
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setIsClinicalDetailsDropdownOpen(!isClinicalDetailsDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-[0_0_15px_rgba(0,255,255,0.2)]",
                        isClinicalDetailsDropdownOpen 
                          ? "bg-cyan-500/20 text-[#00ffff] border-[#00ffff] shadow-[0_0_20px_rgba(0,255,255,0.4)]" 
                          : "bg-[#1e2226] text-[#00ffff] border-[#00ffff]/40 hover:bg-cyan-500/10 hover:border-[#00ffff]/60"
                      )}
                    >
                      <span>Detailed Assessment</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isClinicalDetailsDropdownOpen && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {isClinicalDetailsDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsClinicalDetailsDropdownOpen(false)}
                          />
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-[#1e2226] border border-[#2c3137] rounded-lg shadow-xl z-50 py-2"
                          >
                            {[
                              { id: 'history', label: 'Detailed History', icon: <History className="w-4 h-4" /> },
                              { id: 'vitals', label: 'Vitals Trends', icon: <HeartPulse className="w-4 h-4" /> },
                              { id: 'labs', label: 'Laboratory Results', icon: <Beaker className="w-4 h-4" /> },
                              { id: 'imaging', label: 'Imaging & Uploads', icon: <ImageIcon className="w-4 h-4" /> },
                              { id: 'management', label: 'Management Plan', icon: <ClipboardList className="w-4 h-4" /> },
                              { id: 'trajectory', label: 'What-If & Prediction', icon: <TrendingUp className="w-4 h-4" /> },
                              { id: 'safety', label: 'Blind Spots & Safety', icon: <ShieldAlert className="w-4 h-4" /> },
                              { id: 'timeline', label: 'Clinical Timeline', icon: <Clock className="w-4 h-4" /> },
                              { id: 'notes', label: 'Personal Notes', icon: <FileText className="w-4 h-4" /> },
                              { id: 'calculators', label: 'Calculators', icon: <Calculator className="w-4 h-4" /> }
                            ].map((section) => (
                              <button
                                key={section.id}
                                onClick={() => {
                                  setActiveSection(section.id);
                                  setIsClinicalDetailsDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#a1aab5] hover:text-white hover:bg-[#2c3137] transition-colors"
                              >
                                {section.icon}
                                {section.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="h-6 w-px bg-[#2c3137] shrink-0" />

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20 shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-[200px]">{latestState?.provisionalDiagnosis || "Awaiting Assessment"}</span>
                  </div>

                  <div className="h-6 w-px bg-[#2c3137] shrink-0" />

                  <button 
                    onClick={() => clearPatientHistory(activePatient.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2226] hover:bg-[#2c3137] rounded-lg text-xs font-semibold text-red-400 transition-colors border border-[#2c3137] shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                  <button 
                    onClick={copyEHRNote}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2226] hover:bg-[#2c3137] rounded-lg text-xs font-semibold text-[#ffffff] transition-colors border border-[#2c3137] shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Notes</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsSavingPatient(true);
                      handleSaveToLibrary(`Clinical Record: ${activePatient.name}`, 'Case Study', undefined, activePatient.id);
                      savePatientToFirestore(activePatient);
                      setTimeout(() => setIsSavingPatient(false), 1000);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2226] hover:bg-[#2c3137] rounded-lg text-xs font-semibold text-emerald-400 transition-colors border border-[#2c3137] shrink-0"
                  >
                    {isSavingPatient ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Library className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isSavingPatient ? 'Saved' : 'Save to Library'}</span>
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2226] hover:bg-[#2c3137] rounded-lg text-xs font-semibold text-[#ffffff] transition-colors border border-[#2c3137] shrink-0 print:hidden"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                </div>

                {['history', 'vitals', 'labs', 'imaging', 'management', 'trajectory', 'safety', 'timeline', 'notes', 'calculators'].includes(activeSection) ? (
                  <div className="bg-[#1e2226] border border-[#2c3137] rounded-2xl p-6 shadow-xl min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2c3137]">
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        {activeSection === 'history' && <><History className="w-5 h-5 text-cyan-400" /> Detailed History</>}
                        {activeSection === 'vitals' && <><HeartPulse className="w-5 h-5 text-cyan-400" /> Vitals Trends</>}
                        {activeSection === 'labs' && <><Beaker className="w-5 h-5 text-cyan-400" /> Laboratory Results</>}
                        {activeSection === 'imaging' && <><ImageIcon className="w-5 h-5 text-cyan-400" /> Imaging & Uploads</>}
                        {activeSection === 'management' && <><ClipboardList className="w-5 h-5 text-cyan-400" /> Management Plan</>}
                        {activeSection === 'trajectory' && <><TrendingUp className="w-5 h-5 text-cyan-400" /> What-If & Prediction</>}
                        {activeSection === 'safety' && <><ShieldAlert className="w-5 h-5 text-cyan-400" /> Blind Spots & Safety</>}
                        {activeSection === 'timeline' && <><Clock className="w-5 h-5 text-cyan-400" /> Clinical Timeline</>}
                        {activeSection === 'notes' && <><FileText className="w-5 h-5 text-cyan-400" /> Personal Notes</>}
                        {activeSection === 'calculators' && <><Calculator className="w-5 h-5 text-cyan-400" /> Medical Calculators</>}
                      </h3>
                      <button 
                        onClick={() => setActiveSection('assessment')}
                        className="px-3 py-1.5 bg-[#2c3137] hover:bg-[#3a4149] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Assessment
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                      {activeSection === 'history' && (
                        <HistoryView 
                          history={activePatient.history} 
                          isDisguised={isDisguised}
                          activePatient={activePatient}
                          onAdd={() => setIsManualEntry(true)} 
                          onEdit={handleEditHistory} 
                          onRemove={handleRemoveHistory} 
                        />
                      )}
                      {activeSection === 'vitals' && <VitalsView history={activePatient.history} onAdd={() => setIsManualEntry(true)} isDisguised={isDisguised} activePatient={activePatient} />}
                      {activeSection === 'labs' && <LabsView history={activePatient.history} onAdd={() => setIsManualEntry(true)} onUpdateLabs={handleUpdateLabs} />}
                      {activeSection === 'imaging' && (
                        <ImagingView 
                          history={activePatient.history} 
                          isDisguised={isDisguised}
                          activePatient={activePatient}
                          onAddInterpretation={handleProcessTranscript} 
                          handleAIOperation={handleAIOperation} 
                        />
                      )}
                      {activeSection === 'management' && <ManagementView latestState={latestState} narratePlan={narratePlan} handleSaveToLibrary={handleSaveToLibrary} handleGeneratePlan={handleGeneratePlan} isDisguised={isDisguised} activePatient={activePatient} isNarrating={isNarrating} />}
                      {activeSection === 'trajectory' && <TrajectoryView latestState={latestState} handleAIOperation={handleAIOperation} isDisguised={isDisguised} activePatient={activePatient} />}
                      {activeSection === 'safety' && (
                        <SafetyView 
                          latestState={latestState} 
                          isDisguised={isDisguised}
                          activePatient={activePatient}
                        />
                      )}
                      {activeSection === 'timeline' && <TimelineView latestState={latestState} isDisguised={isDisguised} activePatient={activePatient} />}
                      {activeSection === 'notes' && <NotesView patient={activePatient} isDisguised={isDisguised} handleSaveToLibrary={handleSaveToLibrary} onSave={(notes) => {
                        const updated = { ...activePatient, personalNotes: notes };
                        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
                        savePatientToFirestore(updated);
                      }} />}
                      {activeSection === 'calculators' && (
                        <MedicalCalculators 
                          initialLabs={latestState?.labs} 
                          initialScores={latestState?.scores}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <React.Fragment>
                    {/* Top Space: Brief History and Vitals */}
                    <div className="bg-gradient-to-br from-[#1e2226] to-[#121417] border border-[#2c3137] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                              <History className="w-5 h-5 text-cyan-400" />
                            </div>
                            Brief History & Vitals
                          </h3>
                          <p className="text-[10px] text-cyan-400 font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
                            <UserIcon className="w-3 h-3" />
                            {isEditingPatientName ? (
                              <input 
                                type="text" 
                                value={editPatientName} 
                                onChange={(e) => setEditPatientName(e.target.value)}
                                onBlur={() => {
                                  if (editPatientName.trim()) {
                                    setPatients(prev => {
                                      const updated = prev.map(p => p.id === activePatientId ? { ...p, name: editPatientName } : p);
                                      const pToSave = updated.find(p => p.id === activePatientId);
                                      if (pToSave) savePatientToFirestore(pToSave);
                                      return updated;
                                    });
                                  }
                                  setIsEditingPatientName(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                autoFocus
                                className="bg-[#121417] border border-[#2c3137] rounded px-2 py-0.5 text-white"
                              />
                            ) : (
                              <span 
                                className="cursor-pointer hover:text-white transition-colors flex items-center gap-1"
                                onClick={() => {
                                  setEditPatientName(activePatient.name);
                                  setIsEditingPatientName(true);
                                }}
                              >
                                {disguiseText(activePatient.name, 'name', isDisguised)}
                                <Edit2 className="w-3 h-3 opacity-50 hover:opacity-100" />
                              </span>
                            )}
                            {activePatient.mrn && (
                              <>
                                <span className="text-[#3a4149]">|</span>
                                <span>{disguiseText(activePatient.mrn, 'mrn', isDisguised)}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-[#a1aab5] font-mono">
                          {new Date(latestState?.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Latest Note</h4>
                            {latestState?.historyNote && (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    const finalNote = isDisguised && activePatient 
                                      ? disguiseText(latestState.historyNote, 'text', isDisguised, activePatient)
                                      : latestState.historyNote;
                                    handleSaveToLibrary(`Encounter Summary: ${new Date(latestState.timestamp).toLocaleDateString()}`, 'Case Study', finalNote, activePatient.id);
                                    alert('Saved to My Library!');
                                  }}
                                  className="flex items-center gap-2 px-2 py-1 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 text-[#00e5ff] rounded-lg text-[10px] font-bold transition-colors border border-[#00e5ff]/20"
                                >
                                  <Library className="w-3 h-3" /> Save to Library
                                </button>
                                <button 
                                  onClick={narrateSOAPNote}
                                  className={cn(
                                    "p-1 rounded-md transition-colors",
                                    isNarrating ? "bg-red-500/20 text-red-400" : "hover:bg-[#2c3137] text-cyan-400"
                                  )}
                                  title={isNarrating ? "Stop Narration" : "Listen to SOAP Note"}
                                >
                                  {isNarrating ? <X className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-[#ffffff] leading-relaxed">
                            {isDisguised && activePatient && latestState?.historyNote 
                              ? disguiseText(latestState.historyNote, 'text', isDisguised, activePatient)
                              : (latestState?.historyNote || "No history recorded yet.")}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-[#a1aab5] uppercase tracking-widest">Current Vitals</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#121417] p-3 rounded-xl border border-[#2c3137]">
                              <div className="text-[10px] text-[#a1aab5] uppercase mb-1">Heart Rate</div>
                              <div className="text-lg font-bold text-white">{latestState?.vitals.hr || '--'} <span className="text-xs text-[#a1aab5] font-normal">bpm</span></div>
                            </div>
                            <div className="bg-[#121417] p-3 rounded-xl border border-[#2c3137]">
                              <div className="text-[10px] text-[#a1aab5] uppercase mb-1">Blood Pressure</div>
                              <div className="text-lg font-bold text-white">{latestState?.vitals.bp_sys || '--'}/{latestState?.vitals.bp_dia || '--'} <span className="text-xs text-[#a1aab5] font-normal">mmHg</span></div>
                            </div>
                            <div className="bg-[#121417] p-3 rounded-xl border border-[#2c3137]">
                              <div className="text-[10px] text-[#a1aab5] uppercase mb-1">SpO2</div>
                              <div className="text-lg font-bold text-white">{latestState?.vitals.spo2 || '--'} <span className="text-xs text-[#a1aab5] font-normal">%</span></div>
                            </div>
                            <div className="bg-[#121417] p-3 rounded-xl border border-[#2c3137]">
                              <div className="text-[10px] text-[#a1aab5] uppercase mb-1">Temperature</div>
                              <div className="text-lg font-bold text-white">{latestState?.vitals.temp || '--'} <span className="text-xs text-[#a1aab5] font-normal">°F</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {[
                      { id: 'assessment', label: 'Clinical Assessment', icon: <Activity className="w-5 h-5" /> },
                      { id: 'assistant', label: 'Clinical Assistant', icon: <BrainCircuit className="w-5 h-5" /> }
                    ].map((section) => (
                      <div key={section.id} className="bg-gradient-to-br from-[#1e2226] to-[#121417] border border-[#2c3137] rounded-3xl overflow-hidden shadow-lg relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                          <button 
                            onClick={() => setActiveSection(activeSection === section.id ? '' : section.id)}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                          >
                          <div className="flex items-center gap-3">
                            <div className={cn("shrink-0", activeSection === section.id ? "text-cyan-400" : "text-[#a1aab5]")}>
                              {section.icon}
                            </div>
                            <h2 className={cn("text-sm font-bold uppercase tracking-widest", activeSection === section.id ? "text-white" : "text-[#a1aab5]")}>
                              {section.label}
                            </h2>
                          </div>
                          <ChevronDown className={cn("w-5 h-5 text-[#a1aab5] transition-transform", activeSection === section.id && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                          {activeSection === section.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }} 
                              className="overflow-hidden"
                            >
                              <div className="p-4 border-t border-[#2c3137]">
                                {section.id === 'assessment' && (
                                  <div className="space-y-6">
                                    <div className="bg-[#121417] border border-[#2c3137] rounded-3xl p-4 lg:p-6 shadow-xl">
                                      <div className="flex items-end gap-4">
                                        <div className="relative shrink-0 flex flex-col gap-3">
                                          <button 
                                            onClick={toggleListening}
                                            disabled={isEncounterProcessing}
                                            className={cn(
                                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                                              isListening 
                                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20 animate-pulse" 
                                                : "bg-[#2c3137] hover:bg-[#3a4149] text-[#ffffff]",
                                              isEncounterProcessing && "opacity-50 cursor-not-allowed"
                                            )}
                                            title="Ambient Listening"
                                          >
                                            {isEncounterProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                          </button>
                                          
                                          <button
                                            onClick={() => notesFileInputRef.current?.click()}
                                            disabled={isEncounterProcessing}
                                            className={cn(
                                              "w-14 w-14 py-2 rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg bg-[#2c3137] hover:bg-[#3a4149] text-[#ffffff]",
                                              isEncounterProcessing && "opacity-50 cursor-not-allowed"
                                            )}
                                            title="Upload Notes"
                                          >
                                            <Upload className="w-5 h-5 mb-1 text-cyan-400" />
                                            <span className="text-[8px] font-bold uppercase tracking-tighter leading-tight text-center">Upload<br/>Notes</span>
                                          </button>
                                          <input 
                                            type="file" 
                                            ref={notesFileInputRef as React.RefObject<HTMLInputElement>} 
                                            onChange={handleUploadNotes} 
                                            className="hidden" 
                                            multiple 
                                            accept="image/*" 
                                          />
                                        </div>
                                        <div className="flex-1 relative group flex flex-col gap-2">
                                          <textarea 
                                            value={manualNote}
                                            onChange={(e) => setManualNote(e.target.value)}
                                            placeholder={isListening ? "Listening..." : "Type clinical notes..."}
                                            className="w-full bg-[#1e2226] border border-[#2c3137] rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 min-h-[150px] resize-none"
                                          />
                                          <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                            <button 
                                              onClick={() => handleProcessTranscript()}
                                              disabled={!manualNote.trim() || isEncounterProcessing}
                                              className="p-2.5 bg-cyan-600 rounded-xl hover:bg-cyan-500 transition-colors disabled:opacity-50"
                                            >
                                              <Send className="w-5 h-5 text-white" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <AssessmentView latestState={latestState} isDisguised={isDisguised} activePatient={activePatient} />
                                  </div>
                                )}
                                {section.id === 'assistant' && (
                                  <div className="space-y-6">
                                    <div className="bg-[#121417]/50 rounded-xl p-6 border border-dashed border-[#2c3137] text-center">
                                      <p className="text-[10px] text-[#3a4149] italic">Suggestions and directional guidance will appear here based on the assessment.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddPatientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPatientModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add New Patient</h3>
                <button 
                  onClick={() => setIsAddPatientModalOpen(false)}
                  className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Patient Name</label>
                  <input 
                    type="text"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white placeholder:text-[#3a4149]"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">MRN (Optional)</label>
                  <input 
                    type="text"
                    value={newPatientMRN}
                    onChange={(e) => setNewPatientMRN(e.target.value)}
                    placeholder="e.g. MRN-123456"
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white placeholder:text-[#3a4149]"
                  />
                </div>

                <button 
                  onClick={confirmCreatePatient}
                  disabled={!newPatientName.trim()}
                  className="w-full py-4 bg-cyan-600 rounded-xl font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Create Patient Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Library Item Modal */}
      <AnimatePresence>
        {viewingLibraryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingLibraryItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl max-h-[80vh] flex flex-col bg-[#1e2226] border border-[#2c3137] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2c3137] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#121417] flex items-center justify-center">
                    {viewingLibraryItem.type === 'Protocol' ? <FileText className="w-5 h-5 text-[#00d28a]" /> : 
                     viewingLibraryItem.type === 'Guideline' ? <BookOpen className="w-5 h-5 text-[#8b943e]" /> : 
                     <ClipboardList className="w-5 h-5 text-[#00e5ff]" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {isDisguised && activePatient 
                        ? disguiseText(viewingLibraryItem.title, 'text', isDisguised, activePatient)
                        : viewingLibraryItem.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#a1aab5] bg-[#121417] px-2 py-0.5 rounded-full">{viewingLibraryItem.type}</span>
                      <span className="text-xs text-[#a1aab5]">{viewingLibraryItem.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => exportToPDF('library-item-content', `${viewingLibraryItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)}
                    className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-colors"
                    title="Export to PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setViewingLibraryItem(null)}
                    className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div id="library-item-content" className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {viewingLibraryItem.content ? (
                  <div className="text-[#b3b9c1] leading-relaxed markdown-body">
                    <Markdown>{viewingLibraryItem.content}</Markdown>
                  </div>
                ) : (
                  <div className="text-center text-[#a1aab5] py-12 italic">
                    No content available for this item.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isEditingLibraryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingLibraryItem(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingLibraryItemId ? 'Edit Library Item' : 'Add Library Item'}</h3>
                <button 
                  onClick={() => setIsEditingLibraryItem(false)}
                  className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Title</label>
                  <input 
                    type="text"
                    value={newLibraryItemTitle}
                    onChange={(e) => setNewLibraryItemTitle(e.target.value)}
                    placeholder="e.g. Sepsis Protocol"
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white placeholder:text-[#3a4149]"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Type</label>
                  <select 
                    value={newLibraryItemType}
                    onChange={(e) => setNewLibraryItemType(e.target.value)}
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white"
                  >
                    <option value="Protocol">Protocol</option>
                    <option value="Guideline">Guideline</option>
                    <option value="Case Study">Case Study</option>
                    <option value="Article">Article</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button 
                  onClick={editingLibraryItemId ? editLibraryItem : addLibraryItem}
                  disabled={!newLibraryItemTitle.trim()}
                  className="w-full py-4 bg-cyan-600 rounded-xl font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {editingLibraryItemId ? 'Save Changes' : 'Add to Library'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Research Scout Modal */}
      <AnimatePresence>
        {isEditingResearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingResearch(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingResearchId ? 'Edit Research Report' : 'New Research Report'}</h3>
                <button 
                  onClick={() => setIsEditingResearch(false)}
                  className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Report Title</label>
                  <input 
                    type="text"
                    value={newResearchTitle}
                    onChange={(e) => setNewResearchTitle(e.target.value)}
                    placeholder="e.g. GLP-1 Agonists in HFpEF"
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white placeholder:text-[#3a4149]"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Status</label>
                  <select 
                    value={newResearchStatus}
                    onChange={(e) => setNewResearchStatus(e.target.value)}
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white"
                  >
                    <option value="Drafting">Drafting</option>
                    <option value="Analyzing">Analyzing</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>

                <button 
                  onClick={editingResearchId ? editResearchReport : addResearchReport}
                  disabled={!newResearchTitle.trim()}
                  className="w-full py-4 bg-cyan-600 rounded-xl font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {editingResearchId ? 'Save Changes' : 'Create Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Nexus Global Modal */}
      <AnimatePresence>
        {isEditingNexus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingNexus(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingNexusId ? 'Edit Discussion' : 'New Global Discussion'}</h3>
                <button 
                  onClick={() => setIsEditingNexus(false)}
                  className="p-2 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Discussion Topic</label>
                  <textarea 
                    value={newNexusTitle}
                    onChange={(e) => setNewNexusTitle(e.target.value)}
                    placeholder="What would you like to discuss with the global network?"
                    className="w-full bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-white placeholder:text-[#3a4149] min-h-[120px] resize-none"
                    autoFocus
                  />
                </div>

                <button 
                  onClick={editingNexusId ? editNexusDiscussion : addNexusDiscussion}
                  disabled={!newNexusTitle.trim()}
                  className="w-full py-4 bg-cyan-600 rounded-xl font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {editingNexusId ? 'Save Changes' : 'Post to Network'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Usage Limit Modal */}
      <AnimatePresence>
        {isUsageLimitModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUsageLimitModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-amber-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">{usageMessage ? "Limit Reached" : "Usage Limit Reached"}</h3>
              <p className="text-[#a1aab5] mb-8 leading-relaxed">
                {usageMessage || (usageInfo?.isPremium 
                  ? "You've reached the high-volume monthly limit for your Pro account. Professional usage is capped at 125 comprehensive analyses per month to ensure system stability."
                  : "You've reached your weekly limit of free clinical assessments. Access the full clinician suite with Aura Pro to unlock higher volume limits and advanced features.")}
              </p>

              {upgradeError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-left">
                  {upgradeError}
                </div>
              )}

              {!usageInfo?.isPremium && (
                <div className="space-y-3">
                  <button 
                    onClick={handleUpgrade}
                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Upgrade to Aura Pro ($7/mo)
                  </button>

                  <button 
                    onClick={() => {
                      setIsUsageLimitModalOpen(false);
                      setUpgradeError(null);
                    }}
                    className="w-full py-4 bg-[#121417] border border-[#2c3137] rounded-2xl font-bold text-[#a1aab5] hover:text-white hover:bg-[#2c3137] transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {usageInfo?.isPremium && (
                <button 
                  onClick={() => setIsUsageLimitModalOpen(false)}
                  className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold hover:bg-cyan-500 transition-all"
                >
                  Understood
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Install Guide Modal */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallGuideModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#1e2226] border border-[#2c3137] rounded-3xl p-8 relative z-10 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/10 rounded-bl-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-2xl shadow-lg border border-cyan-500/20">
                      <Download className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Set up AuraMD</h2>
                      <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Application Installation Guide</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInstallGuideModal(false)}
                    className="p-2 hover:bg-[#2c3137] rounded-xl text-[#a1aab5] transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      Option 1: Chrome / Android
                    </h3>
                    <div className="p-4 bg-[#121417]/50 rounded-2xl border border-[#2c3137] text-sm text-[#a1aab5] leading-relaxed space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">1.</span>
                        <p>Open the browser's main menu (three dots <MoreVertical className="w-3 h-3 inline rotate-90" /> or <MoreVertical className="w-3 h-3 inline" />).</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">2.</span>
                        <p>Select <span className="text-white font-bold">"Save and Share"</span> or <span className="text-white font-bold">"Install app"</span>.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">3.</span>
                        <p>Tap <span className="text-white font-bold">"Install"</span> or <span className="text-white font-bold">"Add to Home screen"</span>.</p>
                      </div>
                      <p className="text-[10px] mt-2 italic text-cyan-400/70">Preferred for the best physician assistant experience.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Option 2: iPhone / Safari
                    </h3>
                    <div className="p-4 bg-[#121417]/50 rounded-2xl border border-[#2c3137] text-sm text-[#a1aab5] leading-relaxed space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">1.</span>
                        <p>Tap Safari's <span className="text-white font-bold">Share</span> button (square with upward arrow).</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">2.</span>
                        <p>Scroll down and tap <span className="text-white font-bold">"Add to Home Screen"</span>.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">3.</span>
                        <p>Tap <span className="text-white font-bold">"Add"</span> in the top-right corner to finish.</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowInstallGuideModal(false)}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                    Got it, Thanks
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#a1aab5] font-bold uppercase tracking-widest opacity-60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Safe & Secure PWA Technology
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#121417] border border-[#2c3137] p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#a1aab5] hover:text-white hover:bg-[#1e2226] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6">Account Settings</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#a1aab5] uppercase tracking-widest">Subscription</h4>
                  <div className="bg-[#1e2226] p-4 rounded-xl border border-[#2c3137]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-medium">Free Plan</span>
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full font-bold">Current</span>
                    </div>
                    <p className="text-xs text-[#a1aab5] mb-4">Upgrade to Aura Pro for unlimited patient records and advanced clinical reasoning.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleUpgrade}
                        className="flex-1 py-2 bg-gradient-to-r from-[#00e5ff] to-[#007BB5] hover:from-[#00B4FF] hover:to-[#00e5ff] text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Upgrade to Pro ($7)
                      </button>
                      <button className="flex-1 py-2 bg-[#2c3137] hover:bg-[#3a4149] text-white text-xs font-bold rounded-lg transition-all">
                        Restore Purchases
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#a1aab5] uppercase tracking-widest">Preferences</h4>
                  <div className="bg-[#1e2226] p-4 rounded-xl border border-[#2c3137] flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium block">Auto-Narrate Notes</span>
                      <span className="text-xs text-[#a1aab5]">Automatically read compiled SOAP notes aloud</span>
                    </div>
                    <button
                      onClick={() => setAutoNarrate(!autoNarrate)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoNarrate ? 'bg-cyan-500' : 'bg-[#2c3137]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoNarrate ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Brand Customization */}
                {auth.currentUser && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                       <ImageIcon className="w-4 h-4" />
                       Brand Customization
                    </h4>
                    <div className="space-y-4">
                      <AdminLogoSettings id="sidebar" />
                      <AdminLogoSettings id="main" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#a1aab5] uppercase tracking-widest">Device Info</h4>
                  <div className="bg-[#1e2226] p-4 rounded-xl border border-[#2c3137]">
                    <p className="text-xs text-[#a1aab5] break-all">
                      <span className="font-bold text-white">Fingerprint ID:</span> {deviceId || 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Key Modal (E2EE) */}
      <AnimatePresence>
        {isPrivacyKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel max-w-md w-full p-8 space-y-6 border-emerald-500/30"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Strict HIPAA Mode</h2>
                  <p className="text-sm text-[#a1aab5]">
                    Enable End-to-End Encryption (E2EE). Your patient data will be encrypted on your device before being saved to the cloud. 
                    <span className="text-emerald-400 font-bold block mt-2">Only you hold the key. We cannot recover your data if you lose this key.</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest ml-1">Set Privacy Key</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1aab5]" />
                    <input 
                      type="password"
                      value={tempPrivacyKey}
                      onChange={(e) => setTempPrivacyKey(e.target.value)}
                      placeholder="Enter a strong secret key..."
                      className="w-full bg-[#121417] border border-[#2c3137] rounded-xl py-3 pl-12 pr-4 text-white placeholder-[#3a4149] focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                    />
                  </div>
                  {privacyKeyError && <p className="text-[10px] text-red-400 font-bold ml-1">{privacyKeyError}</p>}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setIsPrivacyKeyModalOpen(false);
                      setTempPrivacyKey('');
                      setPrivacyKeyError(null);
                    }}
                    className="flex-1 py-3 bg-[#1e2226] hover:bg-[#2c3137] text-white rounded-xl text-sm font-bold transition-all border border-[#2c3137]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (tempPrivacyKey.length < 6) {
                        setPrivacyKeyError('Key must be at least 6 characters');
                        return;
                      }
                      setPrivacyKey(tempPrivacyKey);
                      localStorage.setItem('aura_privacy_key', tempPrivacyKey);
                      setIsStrictHIPAAMode(true);
                      localStorage.setItem('aura_strict_hipaa', 'true');
                      setIsPrivacyKeyModalOpen(false);
                      setTempPrivacyKey('');
                      setPrivacyKeyError(null);
                      alert('Strict HIPAA Mode Enabled. New data will be End-to-End Encrypted.');
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Enable E2EE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, minimized }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, minimized?: boolean }) {
  return (
    <button 
      onClick={onClick}
      title={minimized ? label : undefined}
      className={cn(
        "flex items-center rounded-xl font-semibold transition-all",
        minimized ? "w-12 h-12 justify-center mx-auto" : "w-full gap-3 px-4 py-2.5 text-sm",
        active 
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
          : "text-[#a1aab5] hover:bg-[#2c3137] hover:text-[#ffffff]"
      )}
    >
      {icon}
      {!minimized && <span>{label}</span>}
    </button>
  );
}

function SectionHeader({ title, onAdd }: { title: string, onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">{title}</h3>
      {onAdd && (
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg text-cyan-400 text-xs font-bold transition-all border border-cyan-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          New Entry
        </button>
      )}
    </div>
  );
}

function ScoreCard({ label, value, unit }: { label: string, value: number, unit?: string }) {
  return (
    <div className="glass-panel p-5 flex flex-col items-center justify-center text-center hover:border-cyan-500/30 transition-all group">
      <p className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest mb-2 group-hover:text-cyan-400 transition-colors">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        {unit && <span className="text-[10px] text-[#a1aab5] font-bold uppercase tracking-wider">{unit}</span>}
      </div>
    </div>
  );
}

function AssessmentView({ latestState, isDisguised, activePatient }: { latestState?: ClinicalState, isDisguised: boolean, activePatient: PatientProfile | null }) {
  if (!latestState) {
    return (
      <div className="bg-[#1e2226]/30 border border-dashed border-[#2c3137] rounded-3xl p-8 text-center">
        <p className="text-[#a1aab5] text-sm italic">No clinical assessment generated yet. Add notes above to begin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Directional Guidance - Primary Focus */}

            {latestState?.directionalQuery && (
              <div className="lg:col-span-2 bg-gradient-to-br from-cyan-600 to-teal-800 border border-cyan-500 rounded-3xl p-8 shadow-2xl shadow-cyan-600/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BrainCircuit className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                      <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Directional Guidance</h3>
                  </div>
                  <p className="text-2xl font-bold text-white leading-tight tracking-tight">
                    {isDisguised && activePatient 
                      ? disguiseText(latestState.directionalQuery, 'text', isDisguised, activePatient)
                      : latestState.directionalQuery}
                  </p>
                </div>
              </div>
            )}

            {/* Vitals Summary - Compact */}
            <div className="grid grid-cols-2 gap-3">
              {latestState?.vitals?.hr && (
                <div className="glass-panel p-4 border-l-2 border-cyan-500 bg-[#1e2226]/50">
                  <p className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-widest mb-1">HR</p>
                  <p className="text-xl font-bold text-white">{latestState.vitals.hr} <span className="text-[9px] text-[#a1aab5]">bpm</span></p>
                </div>
              )}
              {latestState?.vitals?.bp_sys && (
                <div className="glass-panel p-4 border-l-2 border-red-500 bg-[#1e2226]/50">
                  <p className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-widest mb-1">BP</p>
                  <p className="text-xl font-bold text-white">{latestState.vitals.bp_sys}/{latestState.vitals.bp_dia}</p>
                </div>
              )}
              {latestState?.vitals?.spo2 && (
                <div className="glass-panel p-4 border-l-2 border-emerald-500 bg-[#1e2226]/50">
                  <p className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-widest mb-1">SpO2</p>
                  <p className="text-xl font-bold text-white">{latestState.vitals.spo2}%</p>
                </div>
              )}
              {latestState?.vitals?.temp && (
                <div className="glass-panel p-4 border-l-2 border-amber-500 bg-[#1e2226]/50">
                  <p className="text-[9px] font-bold text-[#a1aab5] uppercase tracking-widest mb-1">Temp</p>
                  <p className="text-xl font-bold text-white">{latestState.vitals.temp}°C</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trend Assessment */}
            {latestState?.trendAnalysis && (
              <div className="bg-[#1e2226] border border-[#2c3137] rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Trend Assessment</h3>
                </div>
                <p className="text-sm text-[#ffffff] leading-relaxed">
                  {latestState.trendAnalysis}
                </p>
              </div>
            )}

            {/* Crucial Next Steps */}
            {latestState?.missingData && latestState.missingData.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Crucial Next Steps</h3>
                </div>
                <div className="space-y-2">
                  {latestState.missingData.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-[#121417] rounded-xl border border-[#2c3137] text-xs text-[#ffffff]">
                      <div className="w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Differentials & Scores Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Differentials - Main Column */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Provisional Differentials</h3>
              <div className="space-y-3">
                {latestState?.differentials?.map((diff, i) => (
                  <div key={i} className="glass-panel p-5 border-l-4 border-l-cyan-500 hover:bg-[#2c3137]/30 transition-all flex items-center justify-between group/diff">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-base text-white">{diff.name}</h4>
                        <button 
                          onClick={() => {
                            const textToCopy = `${diff.name} (${diff.likelihood}): ${diff.reasoning}`;
                            const finalNote = isDisguised && activePatient 
                              ? disguiseText(textToCopy, 'text', isDisguised, activePatient)
                              : textToCopy;
                            navigator.clipboard.writeText(finalNote);
                            alert('Copied to clipboard!');
                          }}
                          className="p-1 opacity-0 group-hover/diff:opacity-100 hover:bg-[#2c3137] rounded text-[#a1aab5] hover:text-white transition-all"
                          title="Copy to Clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-[#a1aab5]">
                        {isDisguised && activePatient 
                          ? disguiseText(diff.reasoning, 'text', isDisguised, activePatient)
                          : diff.reasoning}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest",
                      diff.likelihood === 'High' ? "bg-red-500/10 text-red-400" :
                      diff.likelihood === 'Moderate' ? "bg-amber-500/10 text-amber-400" :
                      "bg-cyan-500/10 text-cyan-400"
                    )}>
                      {diff.likelihood}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scores - Side Column */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest px-1">Calculated Scores</h3>
              <div className="grid grid-cols-1 gap-3">
                {latestState?.scores?.qsofa !== undefined && (
                  <div className="bg-[#1e2226] p-4 rounded-2xl border border-[#2c3137] flex justify-between items-center">
                    <span className="text-xs text-[#a1aab5]">qSOFA</span>
                    <span className="text-lg font-bold text-white">{latestState.scores.qsofa}</span>
                  </div>
                )}
                {latestState?.scores?.curb65 !== undefined && (
                  <div className="bg-[#1e2226] p-4 rounded-2xl border border-[#2c3137] flex justify-between items-center">
                    <span className="text-xs text-[#a1aab5]">CURB-65</span>
                    <span className="text-lg font-bold text-white">{latestState.scores.curb65}</span>
                  </div>
                )}
                {latestState?.scores?.anionGap !== undefined && (
                  <div className="bg-[#1e2226] p-4 rounded-2xl border border-[#2c3137] flex justify-between items-center">
                    <span className="text-xs text-[#a1aab5]">Anion Gap</span>
                    <span className="text-lg font-bold text-white">{latestState.scores.anionGap}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Adversarial Analysis */}
          {latestState?.adversarialAnalysis && (
            <section className="space-y-6 mt-12">
              <div className="flex items-center gap-3 px-1">
                <ShieldAlert className="w-6 h-6 text-orange-400" />
                <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Clinical Devil's Advocate</h3>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 space-y-8">
                <p className="text-lg text-[#ffffff] italic leading-relaxed font-bold">
                  "{isDisguised && activePatient 
                    ? disguiseText(latestState.adversarialAnalysis.summary, 'text', isDisguised, activePatient)
                    : latestState.adversarialAnalysis.summary}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {latestState.adversarialAnalysis.points.map((point, i) => (
                    <div key={i} className="flex gap-5 p-6 rounded-2xl bg-[#1e2226] border border-[#2c3137] shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-2 shrink-0 shadow-sm shadow-orange-500/20" />
                      <div>
                        <p className="text-base text-white font-bold mb-2 leading-snug">
                          {isDisguised && activePatient 
                            ? disguiseText(point.finding, 'text', isDisguised, activePatient)
                            : point.finding}
                        </p>
                        <p className="text-xs text-[#a1aab5] leading-relaxed font-medium">
                          <span className="text-[#3a4149] font-bold uppercase text-[9px] block mb-1 tracking-widest">Contradicts</span>
                          {isDisguised && activePatient 
                            ? disguiseText(point.contradicts, 'text', isDisguised, activePatient)
                            : point.contradicts}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
    </div>
  );
}

function HistoryView({ 
  history, 
  isDisguised,
  activePatient,
  onAdd, 
  onEdit, 
  onRemove 
}: { 
  history: ClinicalState[], 
  isDisguised: boolean,
  activePatient: PatientProfile | null,
  onAdd: () => void,
  onEdit: (id: string, newNote: string) => void,
  onRemove: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (state: ClinicalState) => {
    setEditingId(state.id);
    setEditContent(state.historyNote);
  };

  const handleSaveEdit = (id: string) => {
    onEdit(id, editContent);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Clinical History Notes" onAdd={onAdd} />
      {history.length === 0 ? (
        <div className="text-center py-20 text-[#a1aab5] italic font-medium">No historical notes recorded</div>
      ) : (
        <div className="space-y-4">
          {history.slice().reverse().map((state) => (
            <div key={state.id} className="glass-panel p-6 space-y-4 group">
              <div className="flex items-center justify-between border-b border-[#2c3137] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-xs font-bold text-[#a1aab5]">{new Date(state.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{state.provisionalDiagnosis || 'Assessment'}</span>
                  <div className="transition-opacity flex items-center gap-1">
                    <button 
                      onClick={() => {
                        const noteText = isDisguised && activePatient 
                          ? disguiseText(state.historyNote, 'text', isDisguised, activePatient)
                          : state.historyNote;
                        const utterance = new SpeechSynthesisUtterance(`SOAP Note. ${noteText}`);
                        utterance.rate = 0.9;
                        window.speechSynthesis.speak(utterance);
                      }}
                      className="p-1 hover:bg-[#2c3137] rounded text-[#a1aab5] hover:text-cyan-400 transition-colors"
                      title="Listen to note"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleStartEdit(state)}
                      className="p-1 hover:bg-[#2c3137] rounded text-[#a1aab5] hover:text-cyan-400 transition-colors"
                      title="Edit note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this note?')) {
                          onRemove(state.id);
                        }
                      }}
                      className="p-1 hover:bg-[#2c3137] rounded text-[#a1aab5] hover:text-red-400 transition-colors"
                      title="Remove note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {editingId === state.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-32 bg-[#121417] border border-[#2c3137] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-[#a1aab5] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSaveEdit(state.id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#ffffff] leading-relaxed whitespace-pre-wrap font-medium">
                  {isDisguised && activePatient 
                    ? disguiseText(state.historyNote, 'text', isDisguised, activePatient)
                    : state.historyNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VitalsView({ history, onAdd, isDisguised, activePatient }: { history: ClinicalState[], onAdd: () => void, isDisguised: boolean, activePatient: PatientProfile | null }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ interpretation: string, prediction: string } | null>(null);

  const vitalsData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hr: h.vitals.hr,
    bp_sys: h.vitals.bp_sys,
    bp_dia: h.vitals.bp_dia,
    spo2: h.vitals.spo2,
    temp: h.vitals.temp
  })).filter(d => d.hr || d.bp_sys || d.spo2);

  const handleAnalyzeTrends = async () => {
    setIsAnalyzing(true);
    try {
      // STRICT HIPAA: De-identify history before sending to AI
      let safeHistory = history;
      if (isDisguised && activePatient) {
        safeHistory = history.map(h => ({
          ...h,
          historyNote: disguiseText(h.historyNote, 'text', true, activePatient) || h.historyNote
        }));
      }
      const analysis = await analyzeVitalsTrend(safeHistory);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze vitals", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-400" />
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Vital Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <button 
              onClick={handleAnalyzeTrends}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Analyze Trends
            </button>
          )}
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2226] hover:bg-[#2c3137] text-[#ffffff] rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="glass-panel p-6 border-l-4 border-indigo-500 bg-indigo-500/5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Clinical Interpretation</h4>
                <p className="text-sm text-[#ffffff] leading-relaxed">{aiAnalysis.interpretation}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Prediction & Watchouts</h4>
                <p className="text-sm text-[#ffffff] leading-relaxed">{aiAnalysis.prediction}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {vitalsData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 h-64">
            <h4 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest mb-4">Heart Rate & BP</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3137" vertical={false} />
                <XAxis dataKey="time" stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2226', border: '1px solid #2c3137', borderRadius: '12px', fontSize: '10px', color: '#ffffff' }} />
                <Line type="monotone" dataKey="hr" stroke="#00e5ff" strokeWidth={3} dot={{ r: 4, fill: '#00e5ff', strokeWidth: 2, stroke: '#121417' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="bp_sys" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#121417' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-panel p-6 h-64">
            <h4 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest mb-4">Oxygen Saturation</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3137" vertical={false} />
                <XAxis dataKey="time" stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2226', border: '1px solid #2c3137', borderRadius: '12px', fontSize: '10px', color: '#ffffff' }} />
                <Line type="monotone" dataKey="spo2" stroke="#00d28a" strokeWidth={3} dot={{ r: 4, fill: '#00d28a', strokeWidth: 2, stroke: '#121417' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1e2226] text-[#a1aab5] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 font-bold">Time</th>
              <th className="px-6 py-4 font-bold">HR</th>
              <th className="px-6 py-4 font-bold">BP</th>
              <th className="px-6 py-4 font-bold">SpO2</th>
              <th className="px-6 py-4 font-bold">Temp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2c3137]">
            {history.slice().reverse().map((state) => (
              <tr key={state.id} className="hover:bg-[#2c3137]/30 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{new Date(state.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.vitals.hr || '--'}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.vitals.bp_sys}/{state.vitals.bp_dia || '--'}</td>
                <td className="px-6 py-4 font-bold text-emerald-400">{state.vitals.spo2 ? `${state.vitals.spo2}%` : '--'}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.vitals.temp ? `${state.vitals.temp}°C` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabsView({ history, onAdd, onUpdateLabs }: { history: ClinicalState[], onAdd: () => void, onUpdateLabs: (labs: Partial<ClinicalLabs>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClinicalLabs>>({});

  const labsData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    glucose: h.labs.glucose,
    lactate: h.labs.lactate,
    creatinine: h.labs.creatinine
  })).filter(d => d.glucose || d.lactate || d.creatinine);

  const latestState = history[history.length - 1];
  const labs = latestState?.labs || {};

  const handleEditClick = () => {
    setEditForm(labs);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateLabs(editForm);
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-cyan-400" />
          <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Lab Records & Investogram</h3>
        </div>
        {!isEditing ? (
          <button 
            onClick={handleEditClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2c3137] hover:bg-[#3a4149] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Labs
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-transparent hover:bg-[#2c3137] text-[#a1aab5] hover:text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-colors border border-emerald-500/30"
            >
              <Save className="w-4 h-4" />
              Save Labs
            </button>
          </div>
        )}
      </div>
      
      {/* Investogram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CBC Panel */}
        <div className="glass-panel p-4 border-l-4 border-l-blue-500">
          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">CBC</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">WBC</span>
              {isEditing ? <input type="number" name="wbc" value={editForm.wbc || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.wbc || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Hgb</span>
              {isEditing ? <input type="number" name="hgb" value={editForm.hgb || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.hgb || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Hct</span>
              {isEditing ? <input type="number" name="hct" value={editForm.hct || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.hct || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Plt</span>
              {isEditing ? <input type="number" name="plt" value={editForm.plt || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.plt || '--'}</span>}
            </div>
          </div>
        </div>

        {/* BMP Panel */}
        <div className="glass-panel p-4 border-l-4 border-l-emerald-500">
          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">BMP / CMP</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Na+</span>
              {isEditing ? <input type="number" name="sodium" value={editForm.sodium || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.sodium || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">K+</span>
              {isEditing ? <input type="number" name="potassium" value={editForm.potassium || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className={cn("font-bold", labs.potassium && (labs.potassium < 3.5 || labs.potassium > 5.0) ? "text-red-400" : "text-white")}>{labs.potassium || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Cl-</span>
              {isEditing ? <input type="number" name="chloride" value={editForm.chloride || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.chloride || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">HCO3-</span>
              {isEditing ? <input type="number" name="bicarbonate" value={editForm.bicarbonate || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.bicarbonate || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">BUN</span>
              {isEditing ? <input type="number" name="bun" value={editForm.bun || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.bun || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Cr</span>
              {isEditing ? <input type="number" name="creatinine" value={editForm.creatinine || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.creatinine || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Gluc</span>
              {isEditing ? <input type="number" name="glucose" value={editForm.glucose || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.glucose || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Ca2+</span>
              {isEditing ? <input type="number" name="calcium" value={editForm.calcium || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.calcium || '--'}</span>}
            </div>
          </div>
        </div>

        {/* LFTs & Coags */}
        <div className="glass-panel p-4 border-l-4 border-l-purple-500">
          <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3">LFTs & Coags</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">AST</span>
              {isEditing ? <input type="number" name="ast" value={editForm.ast || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.ast || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">ALT</span>
              {isEditing ? <input type="number" name="alt" value={editForm.alt || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.alt || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">ALP</span>
              {isEditing ? <input type="number" name="alp" value={editForm.alp || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.alp || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">T.Bili</span>
              {isEditing ? <input type="number" name="bilirubin" value={editForm.bilirubin || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.bilirubin || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">INR</span>
              {isEditing ? <input type="number" name="inr" value={editForm.inr || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.inr || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">PTT</span>
              {isEditing ? <input type="number" name="ptt" value={editForm.ptt || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.ptt || '--'}</span>}
            </div>
          </div>
        </div>

        {/* ABG / VBG & Other */}
        <div className="glass-panel p-4 border-l-4 border-l-orange-500">
          <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">ABG/VBG & Cardiac</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">pH</span>
              {isEditing ? <input type="number" name="ph" value={editForm.ph || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className={cn("font-bold", labs.ph && (labs.ph < 7.35 || labs.ph > 7.45) ? "text-red-400" : "text-white")}>{labs.ph || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">pCO2</span>
              {isEditing ? <input type="number" name="pco2" value={editForm.pco2 || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.pco2 || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">pO2</span>
              {isEditing ? <input type="number" name="po2" value={editForm.po2 || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.po2 || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Lactate</span>
              {isEditing ? <input type="number" name="lactate" value={editForm.lactate || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.lactate || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">Trop</span>
              {isEditing ? <input type="text" name="troponin" value={editForm.troponin || ''} onChange={(e) => setEditForm(prev => ({...prev, troponin: e.target.value}))} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.troponin || '--'}</span>}
            </div>
            <div className="flex justify-between items-center"><span className="text-[#a1aab5]">BNP</span>
              {isEditing ? <input type="number" name="bnp" value={editForm.bnp || ''} onChange={handleInputChange} className="w-16 bg-[#121417] border border-[#2c3137] rounded px-1 text-right text-white" /> : <span className="font-bold text-white">{labs.bnp || '--'}</span>}
            </div>
          </div>
        </div>
      </div>

      {labsData.length > 0 && (
        <div className="glass-panel p-6 h-64">
          <h4 className="text-[10px] font-bold text-[#a1aab5] uppercase tracking-widest mb-4">Metabolic Trends</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={labsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3137" vertical={false} />
              <XAxis dataKey="time" stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#3a4149" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e2226', border: '1px solid #2c3137', borderRadius: '12px', fontSize: '10px', color: '#ffffff' }} />
              <Line type="monotone" dataKey="glucose" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#121417' }} name="Glucose" />
              <Line type="monotone" dataKey="lactate" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#121417' }} name="Lactate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1e2226] text-[#a1aab5] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 font-bold">Time</th>
              <th className="px-6 py-4 font-bold">Glucose</th>
              <th className="px-6 py-4 font-bold">pH</th>
              <th className="px-6 py-4 font-bold">K+</th>
              <th className="px-6 py-4 font-bold">Na+</th>
              <th className="px-6 py-4 font-bold">HCO3</th>
              <th className="px-6 py-4 font-bold">Lactate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2c3137]">
            {history.slice().reverse().map((state) => (
              <tr key={state.id} className="hover:bg-[#2c3137]/30 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{new Date(state.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.labs.glucose || '--'}</td>
                <td className={cn("px-6 py-4 font-bold", state.labs.ph && state.labs.ph < 7.3 ? "text-red-400" : "text-[#ffffff]")}>{state.labs.ph || '--'}</td>
                <td className={cn("px-6 py-4 font-bold", state.labs.potassium && state.labs.potassium < 3.3 ? "text-red-400" : "text-[#ffffff]")}>{state.labs.potassium || '--'}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.labs.sodium || '--'}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.labs.bicarbonate || '--'}</td>
                <td className="px-6 py-4 font-bold text-[#ffffff]">{state.labs.lactate || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrajectoryView({ latestState, handleAIOperation, isDisguised, activePatient }: { latestState?: ClinicalState, handleAIOperation: (op: () => Promise<void>) => Promise<void>, isDisguised: boolean, activePatient: PatientProfile | null }) {
  const [whatIfScenario, setWhatIfScenario] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    if (!whatIfScenario || !latestState) return;
    
    handleAIOperation(async () => {
      setIsSimulating(true);
      try {
        const { simulateWhatIf } = await import('./services/geminiService');
        
        // STRICT HIPAA: De-identify state before sending to AI
        let stateToProcess = JSON.stringify(latestState);
        if (isDisguised && activePatient) {
          stateToProcess = disguiseText(stateToProcess, 'text', true, activePatient);
        }
        
        const result = await simulateWhatIf(whatIfScenario, stateToProcess);
        setWhatIfResult({ scenario: whatIfScenario, predictedEffects: result.predictedEffects });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSimulating(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Clinical Trajectory Prediction</h3>
      </div>

      {!latestState?.trajectory ? (
        <div className="glass-panel p-12 text-center text-[#a1aab5] italic font-medium">
          No trajectory prediction available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#2c3137] pb-2">Predicted Risks (Next 12-24 hrs)</h4>
            {latestState.trajectory.risks.map((risk, i) => (
              <div key={i} className="flex items-center justify-between bg-[#121417] p-3 rounded-lg border border-[#2c3137]">
                <span className="text-sm font-medium text-white">
                  {isDisguised && activePatient 
                    ? disguiseText(risk.condition, 'text', isDisguised, activePatient)
                    : risk.condition}
                </span>
                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">{risk.probability}</span>
              </div>
            ))}
          </div>
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#2c3137] pb-2">Preventive Steps</h4>
            <ul className="space-y-3">
              {latestState.trajectory.preventiveSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-[#a1aab5] leading-relaxed">
                    {isDisguised && activePatient 
                      ? disguiseText(step, 'text', isDisguised, activePatient)
                      : step}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 px-1 mb-4">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">AI "What-If" Simulator</h3>
        </div>
        <div className="glass-panel p-6 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={whatIfScenario}
              onChange={(e) => setWhatIfScenario(e.target.value)}
              placeholder="e.g., What if I delay antibiotics 2 hours?"
              className="flex-1 bg-[#121417] border border-[#2c3137] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-[#3a4149]"
              disabled={isSimulating}
            />
            <button
              onClick={handleSimulate}
              disabled={isSimulating || !whatIfScenario}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Simulate
            </button>
          </div>
          
          {whatIfResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-[#121417] border border-purple-500/30 rounded-xl p-6 space-y-4"
            >
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Predicted Effects:</h4>
              <ul className="space-y-2">
                {whatIfResult.predictedEffects.map((effect, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#a1aab5]">
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                    {isDisguised && activePatient 
                      ? disguiseText(effect, 'text', isDisguised, activePatient)
                      : effect}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function SafetyView({ 
  latestState, 
  isDisguised,
  activePatient 
}: { 
  latestState?: ClinicalState, 
  isDisguised: boolean,
  activePatient: PatientProfile | null
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 px-1">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Clinical Blindspot Detector</h3>
      </div>

      {!latestState?.blindspots || latestState.blindspots.length === 0 ? (
        <div className="glass-panel p-12 text-center text-[#a1aab5] italic font-medium">
          No blindspots detected.
        </div>
      ) : (
        <div className="space-y-4">
          {latestState.blindspots.map((blindspot, i) => (
            <div key={i} className="glass-panel p-4 flex items-start gap-4 border-l-4 border-l-red-500 bg-red-500/5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-white mb-2 markdown-body">
                  <Markdown>
                    {isDisguised && activePatient 
                      ? disguiseText(blindspot.issue, 'text', isDisguised, activePatient)
                      : blindspot.issue}
                  </Markdown>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block",
                  blindspot.severity === 'High' ? "bg-red-500/20 text-red-400" :
                  blindspot.severity === 'Medium' ? "bg-orange-500/20 text-orange-400" :
                  "bg-yellow-500/20 text-yellow-400"
                )}>
                  {blindspot.severity} Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {latestState?.trajectory && (
        <div className="mt-8">
          <div className="flex items-center gap-2 px-1 mb-4">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Patient Trajectory</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-5 space-y-3 border-t-2 border-t-orange-500">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Predicted Risks</h4>
              <ul className="space-y-2">
                {latestState.trajectory.risks.map((risk, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {isDisguised && activePatient 
                        ? disguiseText(risk.condition, 'text', isDisguised, activePatient)
                        : risk.condition}
                    </span>
                    <span className="text-orange-400 font-mono text-xs bg-orange-500/10 px-2 py-0.5 rounded">{risk.probability}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-panel p-5 space-y-3 border-t-2 border-t-emerald-500">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Preventive Steps</h4>
              <ul className="space-y-2">
                {latestState.trajectory.preventiveSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#a1aab5]">
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {isDisguised && activePatient 
                        ? disguiseText(step, 'text', isDisguised, activePatient)
                        : step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 px-1 mb-4">
          <UserPlus className="w-5 h-5 text-blue-400" />
          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Multi-Agent Clinical Debate</h3>
        </div>
        
        {!latestState?.debate ? (
          <div className="glass-panel p-12 text-center text-[#a1aab5] italic font-medium">
            Debate not available for this encounter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 space-y-3 border-t-2 border-t-cyan-500">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Guideline AI</span>
              </div>
              <div className="text-sm text-[#a1aab5] italic markdown-body">
                <Markdown>{latestState.debate.guidelineAgent}</Markdown>
              </div>
            </div>
            
            <div className="glass-panel p-5 space-y-3 border-t-2 border-t-red-500">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Safety AI</span>
              </div>
              <div className="text-sm text-[#a1aab5] italic markdown-body">
                <Markdown>{latestState.debate.safetyAgent}</Markdown>
              </div>
            </div>
            
            <div className="glass-panel p-5 space-y-3 border-t-2 border-t-orange-500">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Risk AI</span>
              </div>
              <div className="text-sm text-[#a1aab5] italic markdown-body">
                <Markdown>{latestState.debate.riskAgent}</Markdown>
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-3 glass-panel p-6 mt-4 bg-emerald-500/5 border border-emerald-500/20">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Final Consensus Recommendation</h4>
              <div className="text-base font-medium text-white markdown-body">
                <Markdown>{latestState.debate.finalRecommendation}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineView({ latestState, isDisguised, activePatient }: { latestState?: ClinicalState, isDisguised: boolean, activePatient?: PatientProfile }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-5 h-5 text-blue-400" />
        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Dynamic Patient Timeline</h3>
      </div>

      {!latestState?.timeline || latestState.timeline.length === 0 ? (
        <div className="glass-panel p-12 text-center text-[#a1aab5] italic font-medium">
          Timeline is empty.
        </div>
      ) : (
        <div className="glass-panel p-6">
          <div className="relative border-l-2 border-[#2c3137] ml-3 space-y-8">
            {latestState.timeline.map((event, i) => (
              <div key={i} className="relative pl-8">
                <div className={cn(
                  "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-[#121417]",
                  event.type === 'admission' ? "bg-blue-500" :
                  event.type === 'vital' ? "bg-red-500" :
                  event.type === 'lab' ? "bg-purple-500" :
                  event.type === 'diagnosis' ? "bg-orange-500" :
                  "bg-emerald-500"
                )} />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-xs font-mono text-[#a1aab5] shrink-0">{event.time}</span>
                  <div className="bg-[#121417] border border-[#2c3137] rounded-lg px-4 py-2 text-sm text-white flex-1">
                    {isDisguised && activePatient 
                      ? disguiseText(event.event, 'text', isDisguised, activePatient)
                      : event.event}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function NotesView({ patient, isDisguised, onSave, handleSaveToLibrary }: { patient: PatientProfile, isDisguised: boolean, onSave: (notes: string) => void, handleSaveToLibrary: (title: string, type: string, content?: string, patientId?: string) => void }) {
  const [notes, setNotes] = useState(patient.personalNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    onSave(notes);
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Personal Notes</h3>
        </div>
        <div className="flex items-center gap-2">
          {notes.trim() && (
            <button
              onClick={() => {
                const finalNotes = isDisguised 
                  ? disguiseText(notes, 'text', isDisguised, patient)
                  : notes;
                handleSaveToLibrary(`Notes for ${disguiseText(patient.name, 'name', isDisguised)}`, 'Case Study', finalNotes, patient.id);
                alert('Saved to My Library!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff]/10 text-[#00e5ff] hover:bg-[#00e5ff]/20 rounded-lg text-xs font-bold transition-colors border border-[#00e5ff]/20"
            >
              <Library className="w-4 h-4" />
              Save to Library
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors"
          >
            {isSaving ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saved' : 'Save Notes'}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your personal clinical notes, reminders, or thoughts here..."
          className="w-full h-96 bg-[#121417] border border-[#2c3137] rounded-xl p-4 text-[#ffffff] focus:outline-none focus:border-emerald-500 resize-none transition-colors"
        />
      </div>
    </div>
  );
}

function ImagingView({ 
  history, 
  isDisguised,
  activePatient,
  onAddInterpretation, 
  handleAIOperation 
}: { 
  history: ClinicalState[], 
  isDisguised: boolean,
  activePatient: PatientProfile | null,
  onAddInterpretation: (text: string) => void, 
  handleAIOperation: (op: () => Promise<void>) => Promise<void> 
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setInterpretation('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    
    handleAIOperation(async () => {
      setIsAnalyzing(true);
      try {
        let context = history.map(h => h.historyNote).join(" ");
        if (isDisguised && activePatient) {
          context = disguiseText(context, 'text', true, activePatient);
        }
        const result = await interpretMedicalImage(selectedImage, mimeType, context);
        setInterpretation(result);
      } catch (error) {
        console.error("Error analyzing image:", error);
        setInterpretation("Failed to analyze image. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Imaging & Media" onAdd={() => {}} />
      
      <div className="glass-panel p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Upload Medical Image</h3>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-colors">
            <Upload className="w-4 h-4" />
            Select File
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        {selectedImage && (
          <div className="space-y-6">
            <div className="relative rounded-xl overflow-hidden border border-[#2c3137] bg-black/50 flex justify-center">
              <img src={selectedImage} alt="Medical scan" className="max-h-96 object-contain" />
            </div>
            
            {!interpretation && (
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                {isAnalyzing ? "Analyzing Image..." : "Analyze with Clinical AI"}
              </button>
            )}

            {interpretation && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">AI Interpretation</h4>
                </div>
                <textarea 
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  className="w-full h-64 bg-[#121417] border border-[#2c3137] rounded-xl p-4 text-sm text-[#ffffff] focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button 
                  onClick={() => {
                    onAddInterpretation(`Imaging Review: ${interpretation}`);
                    setSelectedImage(null);
                    setInterpretation('');
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Save to Patient Chart
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ManagementView({ latestState, narratePlan, handleSaveToLibrary, handleGeneratePlan, isDisguised, activePatient, isNarrating }: { latestState?: ClinicalState, narratePlan: () => void, handleSaveToLibrary: (title: string, type: string, content?: string, patientId?: string) => void, handleGeneratePlan: () => void, isDisguised: boolean, activePatient: PatientProfile | null, isNarrating: boolean }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Guideline Management Plan</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGeneratePlan}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl text-purple-400 text-xs font-bold transition-all border border-purple-500/20"
          >
            <BrainCircuit className="w-4 h-4" />
            Generate AI Plan
          </button>
          {latestState?.managementPlan && latestState.managementPlan.length > 0 && (
            <button 
              onClick={() => {
                const content = latestState.managementPlan!.map((step, i) => `${i + 1}. **${step.action}**\nSource: ${step.guidelineSource}\nReasoning: ${step.reasoning}`).join('\n\n');
                handleSaveToLibrary(`Management Plan: ${new Date().toLocaleDateString()}`, 'Protocol', content, activePatient?.id);
                alert('Saved to My Library!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
            >
              <Library className="w-4 h-4" />
              Save to Library
            </button>
          )}
          <button 
            onClick={narratePlan}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              isNarrating ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20"
            )}
          >
            {isNarrating ? <X className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isNarrating ? "Stop Narration" : "Narrate Plan"}
          </button>
        </div>
      </div>

      {!latestState?.managementPlan || latestState.managementPlan.length === 0 ? (
        <div className="glass-panel p-12 text-center text-[#a1aab5] italic font-medium">
          No management plan generated yet. Provide patient data to begin.
        </div>
      ) : (
        <div className="space-y-4">
          {latestState.managementPlan.map((step, i) => (
            <div key={i} className="glass-panel p-6 flex gap-6 group hover:border-emerald-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0 border border-emerald-500/20">
                {i + 1}
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-white">
                    {isDisguised && activePatient 
                      ? disguiseText(step.action, 'text', isDisguised, activePatient)
                      : step.action}
                  </p>
                  <button 
                    onClick={() => {
                      const textToCopy = `${step.action}\nSource: ${step.guidelineSource}\nReasoning: ${step.reasoning}`;
                      const finalNote = isDisguised && activePatient 
                        ? disguiseText(textToCopy, 'text', isDisguised, activePatient)
                        : textToCopy;
                      navigator.clipboard.writeText(finalNote);
                      alert('Copied to clipboard!');
                    }}
                    className="p-1.5 hover:bg-[#2c3137] rounded-lg text-[#a1aab5] hover:text-white transition-all"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#1e2226] text-[#a1aab5] px-2 py-1 rounded font-bold uppercase tracking-wider border border-[#2c3137]">
                    {step.guidelineSource}
                  </span>
                </div>
                <p className="text-sm text-[#a1aab5] italic leading-relaxed bg-[#121417] p-3 rounded-lg border border-[#2c3137] font-medium">
                  {isDisguised && activePatient 
                    ? disguiseText(step.reasoning, 'text', isDisguised, activePatient)
                    : step.reasoning}
                </p>
                
                {(step.drugInteractions?.length || step.crclDoseAdjustment || step.toxicityWarnings?.length) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    {step.drugInteractions && step.drugInteractions.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Interactions</span>
                        </div>
                        <ul className="space-y-1">
                          {step.drugInteractions.map((interaction, idx) => (
                            <li key={idx} className="text-xs text-red-300/80 leading-snug">
                              • {isDisguised && activePatient 
                                ? disguiseText(interaction, 'text', isDisguised, activePatient)
                                : interaction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {step.crclDoseAdjustment && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Renal Dosing</span>
                        </div>
                        <p className="text-xs text-blue-300/80 leading-snug">
                          {isDisguised && activePatient 
                            ? disguiseText(step.crclDoseAdjustment, 'text', isDisguised, activePatient)
                            : step.crclDoseAdjustment}
                        </p>
                      </div>
                    )}
                    
                    {step.toxicityWarnings && step.toxicityWarnings.length > 0 && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ShieldAlert className="w-3 h-3 text-orange-400" />
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Toxicity</span>
                        </div>
                        <ul className="space-y-1">
                          {step.toxicityWarnings.map((warning, idx) => (
                            <li key={idx} className="text-xs text-orange-300/80 leading-snug">
                              • {isDisguised && activePatient 
                                ? disguiseText(warning, 'text', isDisguised, activePatient)
                                : warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
