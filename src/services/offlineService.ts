
import { openDB, IDBPDatabase } from 'idb';
import { fetchClinicalReasoning } from './geminiService';

const DB_NAME = 'AuraMD_Offline_Cache';
const STORE_NAME = 'protocols';
const VERSION = 1;

export interface CachedProtocol {
  id: string;
  query: string;
  data: any;
  timestamp: number;
  isCore: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('query', 'query', { unique: false });
          store.createIndex('isCore', 'isCore', { unique: false });
        }
      },
    });
  }
  return dbPromise;
};

const CORE_PROTOCOLS = [
  "Sepsis Management (SSC 2021)",
  "Acute Myocardial Infarction (STEMI/NSTEMI)",
  "Acute Ischemic Stroke (AHA/ASA)",
  "Anaphylaxis Emergency Protocol",
  "Diabetic Ketoacidosis (DKA) Management",
  "Pulmonary Embolism (PE) Risk & Treatment",
  "ACLS Cardiac Arrest Algorithms",
  "Acute Decompensated Heart Failure",
  "Status Epilepticus Management",
  "Hyperkalemia Emergency Treatment"
];

export const preloadCoreProtocols = async (isPremium: boolean, onProgress?: (current: number, total: number, label: string) => void) => {
  // Allow preloading for everyone to ensure the feature is testable and functional
  // In a real production app, you might restrict this to premium, but for this companion app, 
  // offline access to core protocols is a key value proposition.
  
  const db = await getDB();
  const total = CORE_PROTOCOLS.length;
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < total; i++) {
    const query = CORE_PROTOCOLS[i];
    const id = query.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Check if already cached
    const existing = await db.get(STORE_NAME, id);
    if (existing) {
      if (onProgress) onProgress(i + 1, total, query);
      continue;
    }
    
    // If not cached and online, fetch and cache
    if (navigator.onLine) {
      let retries = 4;
      let delay = 10000; // Start with 10 seconds delay for rate limits

      while (retries > 0) {
        try {
          if (onProgress) onProgress(i + 1, total, `Downloading ${query}...`);
          const data = await fetchClinicalReasoning(query);
          await db.put(STORE_NAME, {
            id,
            query,
            data,
            timestamp: Date.now(),
            isCore: true
          });
          
          // Add an 8 second delay between successful requests to stay well under 15 RPM limit
          await sleep(8000);
          break; // Success, break out of retry loop
        } catch (error: any) {
          console.error(`Failed to preload ${query} (Retries left: ${retries - 1}):`, error);
          
          // Check if it's a rate limit error (429)
          const isRateLimit = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
          
          if (isRateLimit && retries > 1) {
            if (onProgress) onProgress(i + 1, total, `Rate limited. Waiting ${delay/1000}s...`);
            await sleep(delay);
            delay *= 1.5; // Exponential backoff
            retries--;
          } else if (isRateLimit) {
            console.error("Rate limit completely exhausted. Stopping preloading for now.");
            if (onProgress) onProgress(i + 1, total, "Preloading paused (Rate Limit)");
            return; // Stop the entire preloading process
          } else {
            break; // Break if not rate limit
          }
        }
      }
    }
    
    if (onProgress) onProgress(i + 1, total, query);
  }
};

export const getCachedProtocol = async (query: string): Promise<any | null> => {
  const db = await getDB();
  const id = query.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Try exact ID match first
  const exactMatch = await db.get(STORE_NAME, id);
  if (exactMatch) return exactMatch.data;
  
  // Try fuzzy search in index
  const all = await db.getAll(STORE_NAME);
  const fuzzyMatch = all.find(item => 
    item.query.toLowerCase().includes(query.toLowerCase()) || 
    query.toLowerCase().includes(item.query.toLowerCase())
  );
  
  return fuzzyMatch ? fuzzyMatch.data : null;
};

export const getOfflineStatus = async (): Promise<{ cachedCount: number, coreCount: number }> => {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return {
    cachedCount: all.length,
    coreCount: all.filter(i => i.isCore).length
  };
};
