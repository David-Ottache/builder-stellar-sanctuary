import { RequestHandler } from 'express';
import { getFirestore, initializeFirebaseAdmin, isInitialized } from '../config/firebaseAdmin';

async function ensureDb() {
  if (!isInitialized()) {
    const init = await initializeFirebaseAdmin();
    if (!init.initialized) return null;
  }
  return getFirestore();
}

export const listUsers: RequestHandler = async (req, res) => {
  try {
    const db = await ensureDb();
    if (!db) return res.json({ users: [] });
    const q = await db.collection('users').limit(500).get();
    const users = q.docs.map(d=> ({ id: d.id, ...(d.data() as any) }));
    return res.json({ users });
  } catch (e) {
    console.warn('listUsers error', e);
    return res.json({ users: [] });
  }
};

export const listDrivers: RequestHandler = async (req, res) => {
  try {
    const db = await ensureDb();
    if (!db) return res.json({ drivers: [] });
    const q = await db.collection('drivers').limit(500).get();
    const drivers = q.docs.map(d=> ({ id: d.id, ...(d.data() as any) }));
    return res.json({ drivers });
  } catch (e) {
    console.warn('listDrivers error', e);
    return res.json({ drivers: [] });
  }
};

export const listTrips: RequestHandler = async (req, res) => {
  try {
    const db = await ensureDb();
    if (!db) return res.json({ trips: [] });
    const q = await db.collection('trips').limit(500).get();
    const trips = q.docs.map(d=> ({ id: d.id, ...(d.data() as any) }));
    trips.sort((a:any,b:any)=> (b.startedAt? new Date(b.startedAt).getTime():0) - (a.startedAt? new Date(a.startedAt).getTime():0));
    return res.json({ trips });
  } catch (e) {
    console.warn('listTrips error', e);
    return res.json({ trips: [] });
  }
};

export const listCommissions: RequestHandler = async (_req, res) => {
  try {
    const db = await ensureDb();
    if (!db) return res.json({ commissions: [] });
    const q = await db.collection('walletTransactions').where('type','==','commission').limit(500).get().catch(()=>({docs:[]} as any));
    const commissions = (q.docs || []).map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
    commissions.sort((a:any,b:any)=> (b.ts? new Date(b.ts).getTime():0) - (a.ts? new Date(a.ts).getTime():0));
    return res.json({ commissions });
  } catch (e) {
    console.warn('listCommissions error', e);
    return res.json({ commissions: [] });
  }
};
