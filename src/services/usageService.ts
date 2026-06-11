
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserUsage {
  id: string;
  lastUsageDate: string; // YYYY-MM-DD
  periodCount: number; // Stored in DB as 'dailyCount' for compatibility
  isPremium: boolean;
  associatedAccounts?: string[]; // Track unique accounts per device
}

export const FREE_WEEKLY_LIMIT = 6;
export const PRO_MONTHLY_LIMIT = 125; // Total analyses per month
export const MAX_ACCOUNTS_PER_DEVICE = 2; // Strict limit on unique accounts per device for free tier

export const getStartOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 0); // Always get Monday as start of week if preferred, but Sunday is current default.
  // Actually, keep standard Sunday start for now but make it explicit
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
};

export const getStartOfMonth = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

export const validateUsagePeriod = (data: any): number => {
  if (!data) return 0;
  const isPremium = data.isPremium || false;
  const currentPeriod = isPremium ? getStartOfMonth() : getStartOfWeek();
  
  if (data.lastUsageDate === currentPeriod) {
    return data.dailyCount || 0;
  }
  return 0; // Period has changed, count is effectively 0
};

export const getNextResetDate = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysUntilSunday = 7 - day;
  const nextSunday = new Date(d);
  nextSunday.setDate(d.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const checkUsageLimit = async (userId: string | null, deviceId: string | null): Promise<{ allowed: boolean; count: number; limit: number; isPremium: boolean; message?: string }> => {
  const currentWeek = getStartOfWeek();
  const currentMonth = getStartOfMonth();
  
  let userCount = 0;
  let deviceCount = 0;
  let isPremium = false;
  let maxCount = 0;

  // 1. Fetch User Data
  if (userId) {
    const userUsageRef = doc(db, 'usage', userId);
    const userUsageSnap = await getDoc(userUsageRef);
    if (userUsageSnap.exists()) {
      const data = userUsageSnap.data();
      isPremium = data.isPremium || false;
      userCount = validateUsagePeriod(data);
    }
  }

  // 2. Fetch Device Data
  if (deviceId) {
    const deviceUsageRef = doc(db, 'usage', `device_${deviceId}`);
    const deviceUsageSnap = await getDoc(deviceUsageRef);
    if (deviceUsageSnap.exists()) {
      const data = deviceUsageSnap.data();
      // If the device itself is flagged as premium (pro hardware), honor it
      if (data.isPremium) isPremium = true;
      
      deviceCount = validateUsagePeriod(data);

      // VIGILANCE: Check for account rotation on free tier
      if (!isPremium) {
        const accounts = data.associatedAccounts || [];
        if (accounts.length > MAX_ACCOUNTS_PER_DEVICE) {
          return { 
            allowed: false, 
            count: Math.max(userCount, deviceCount), 
            limit: 0, 
            isPremium: false,
            message: "This device has been associated with multiple accounts. To prevent free tier abuse, access is restricted. Please upgrade to Aura Pro."
          };
        }
      }
    }
  }

  // 3. Rigorous Count Calculation: Use the HIGHEST count across all identifiers
  maxCount = Math.max(userCount, deviceCount);
  const limit = isPremium ? PRO_MONTHLY_LIMIT : FREE_WEEKLY_LIMIT;

  // 4. Final Permission Check
  if (maxCount >= limit) {
    const periodName = isPremium ? "monthly" : "weekly";
    const nextReset = isPremium ? "the 1st of next month" : "next Sunday";
    return {
      allowed: false,
      count: maxCount,
      limit: limit,
      isPremium: isPremium,
      message: `You've reached your ${periodName} limit of ${limit} clinical analyses. Your quota will reset on ${nextReset}.`
    };
  }

  return { 
    allowed: true, 
    count: maxCount, 
    limit: limit, 
    isPremium: isPremium 
  };
};

export const incrementUsage = async (userId: string | null, deviceId: string | null) => {
  const currentWeek = getStartOfWeek();
  const currentMonth = getStartOfMonth();
  
  // First, find the current max count to ensure we don't "desync" downwards
  const { count: currentMax, isPremium } = await checkUsageLimit(userId, deviceId);
  const nextCount = currentMax + 1;
  const period = isPremium ? currentMonth : currentWeek;

  // 1. Sync & Update User Usage
  if (userId) {
    const userUsageRef = doc(db, 'usage', userId);
    await setDoc(userUsageRef, {
      id: userId,
      lastUsageDate: period,
      dailyCount: nextCount,
      isPremium: isPremium
    }, { merge: true });
  }

  // 2. Sync & Update Device Usage
  if (deviceId) {
    const deviceUsageRef = doc(db, 'usage', `device_${deviceId}`);
    const deviceUsageSnap = await getDoc(deviceUsageRef);
    
    let updatedAccounts: string[] = [];
    if (deviceUsageSnap.exists()) {
      const data = deviceUsageSnap.data();
      const accounts = data.associatedAccounts || [];
      updatedAccounts = userId && !accounts.includes(userId) ? [...accounts, userId] : accounts;
    } else if (userId) {
      updatedAccounts = [userId];
    }

    await setDoc(deviceUsageRef, {
      id: `device_${deviceId}`,
      lastUsageDate: period,
      dailyCount: nextCount,
      isPremium: isPremium,
      associatedAccounts: updatedAccounts
    }, { merge: true });
  }
};
