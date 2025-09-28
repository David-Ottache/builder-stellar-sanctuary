import type { RequestHandler } from 'express';
import { isInitialized, getFirestore } from '../config/firebaseAdmin';

export type AppSettings = {
  appName?: string;
  branding?: { primary?: string; secondary?: string };
  support?: { email?: string; phone?: string; twitter?: string };
  timezone?: string;
  currency?: string;
  ride?: {
    baseFare: number;
    costPerKm: number;
    costPerMinute?: number;
    surgeEnabled?: boolean;
    surgeMultiplier?: number;
    minDistanceKm?: number;
    maxDistanceKm?: number;
    cancelFee?: number;
    waitingPerMinute?: number;
  };
  payments?: {
    defaultMethods?: string[];
    commissionPercent?: number;
    withdrawalMin?: number;
    withdrawalFee?: number;
    walletTopupMax?: number;
  };
};

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'reCab',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  ride: { baseFare: 200, costPerKm: 50, costPerMinute: 0, surgeEnabled: false, surgeMultiplier: 1, minDistanceKm: 0, maxDistanceKm: 1000, cancelFee: 0, waitingPerMinute: 0 },
  payments: { defaultMethods: ['cash','wallet'], commissionPercent: 10, withdrawalMin: 1000, withdrawalFee: 0, walletTopupMax: 200000 },
};

let inMemorySettings: AppSettings = DEFAULT_SETTINGS;

export const getSettings: RequestHandler = async (_req, res) => {
  try {
    if (isInitialized()) {
      const db = getFirestore();
      const doc = await db.collection('config').doc('settings').get();
      if (doc.exists) {
        const data = doc.data() as AppSettings;
        return res.json({ settings: { ...DEFAULT_SETTINGS, ...data } });
      }
    }
  } catch (e) {
    // ignore and fallback
  }
  return res.json({ settings: inMemorySettings || DEFAULT_SETTINGS });
};

export const updateSettings: RequestHandler = async (req, res) => {
  try {
    const body = (req.body || {}) as Partial<AppSettings>;
    const next: AppSettings = { ...DEFAULT_SETTINGS, ...inMemorySettings, ...body, ride: { ...DEFAULT_SETTINGS.ride, ...(inMemorySettings.ride||{}), ...(body.ride||{}) }, payments: { ...DEFAULT_SETTINGS.payments, ...(inMemorySettings.payments||{}), ...(body.payments||{}) } };

    try {
      if (isInitialized()) {
        const db = getFirestore();
        await db.collection('config').doc('settings').set(next, { merge: true });
      } else {
        inMemorySettings = next;
      }
    } catch (e) {
      inMemorySettings = next;
    }

    return res.json({ ok: true, settings: next });
  } catch (e) {
    console.error('updateSettings error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
