import { RequestHandler } from "express";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { ts: number; data: any }>();

export function setCache(id: string, data: any) {
  try { cache.set(String(id), { ts: Date.now(), data }); } catch (e) { /* ignore */ }
}

export const lookupById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.debug('lookupById called for id', id);
    if (!id) return res.status(400).json({ error: 'id required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) {
        console.warn('firebase not initialized in lookupById');
        return res.status(503).json({ error: 'database not available' });
      }
    }

    const db = getFirestore();
    if (!db) {
      console.warn('no firestore instance in lookupById');
      return res.status(503).json({ error: 'database not available' });
    }

    // try drivers by doc id
    const driverDoc = await db.collection('drivers').doc(id).get();
    if (driverDoc.exists) {
      const data: any = driverDoc.data();
      console.debug('lookupById found driver by doc id', driverDoc.id);
      return res.json({ driver: { id: driverDoc.id, ...data } });
    }

    // try users by doc id
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      const data: any = userDoc.data();
      console.debug('lookupById found user by doc id', userDoc.id);
      return res.json({ user: { id: userDoc.id, ...data } });
    }

    // fallback: query drivers where stored 'id' field equals param
    const dq = await db.collection('drivers').where('id', '==', id).limit(1).get();
    if (!dq.empty) {
      const d = dq.docs[0];
      console.debug('lookupById found driver by id field', d.id);
      return res.json({ driver: { id: d.id, ...(d.data() as any) } });
    }

    // fallback: query users where stored 'id' field equals param
    const uq = await db.collection('users').where('id', '==', id).limit(1).get();
    if (!uq.empty) {
      const u = uq.docs[0];
      console.debug('lookupById found user by id field', u.id);
      return res.json({ user: { id: u.id, ...(u.data() as any) } });
    }

    console.debug('lookupById not found', id);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('lookupById error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
