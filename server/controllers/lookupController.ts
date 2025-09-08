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

    // check in-memory cache first
    try {
      const cached = cache.get(String(id));
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        console.debug('lookupById cache hit for', id);
        return res.json(cached.data);
      }
    } catch (e) { /* ignore cache errors */ }

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
      const out = { driver: { id: driverDoc.id, ...data } };
      try { setCache(driverDoc.id, out); } catch (e) {}
      return res.json(out);
    }

    // try users by doc id
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      const data: any = userDoc.data();
      console.debug('lookupById found user by doc id', userDoc.id);
      const out = { user: { id: userDoc.id, ...data } };
      try { setCache(userDoc.id, out); } catch (e) {}
      return res.json(out);
    }

    // fallback: query drivers where stored 'id' field equals param
    const dq = await db.collection('drivers').where('id', '==', id).limit(1).get();
    if (!dq.empty) {
      const d = dq.docs[0];
      console.debug('lookupById found driver by id field', d.id);
      const out = { driver: { id: d.id, ...(d.data() as any) } };
      try { setCache(d.id, out); } catch (e) {}
      return res.json(out);
    }

    // fallback: query users where stored 'id' field equals param
    const uq = await db.collection('users').where('id', '==', id).limit(1).get();
    if (!uq.empty) {
      const u = uq.docs[0];
      console.debug('lookupById found user by id field', u.id);
      const out = { user: { id: u.id, ...(u.data() as any) } };
      try { setCache(u.id, out); } catch (e) {}
      return res.json(out);
    }

    console.debug('lookupById not found', id);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('lookupById error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
