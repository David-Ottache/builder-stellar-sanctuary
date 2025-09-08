import { RequestHandler } from "express";
import { initializeFirebaseAdmin, isInitialized, getFirestore } from "../config/firebaseAdmin";

// In-memory presence fallback
const inMemoryPresence: Map<string, any> = new Map();

export const setPresence: RequestHandler = async (req, res) => {
  try {
    const { id, lat, lng, online = true } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    // try to ensure firebase initialized
    if (!isInitialized()) {
      try { await initializeFirebaseAdmin(); } catch (e) { /* ignore */ }
    }

    const db = getFirestore();
    if (db) {
      try {
        const docRef = db.collection('presence').doc(String(id));
        await docRef.set({ id, lat, lng, online, updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ ok: true });
      } catch (e) {
        console.warn('Failed writing presence to firestore', e);
      }
    }

    // fallback to in-memory
    inMemoryPresence.set(String(id), { id, lat, lng, online, updatedAt: new Date().toISOString() });
    return res.json({ ok: true });
  } catch (e) {
    console.error('setPresence error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const listPresence: RequestHandler = async (_req, res) => {
  try {
    if (!isInitialized()) {
      try { await initializeFirebaseAdmin(); } catch (e) { /* ignore */ }
    }
    const db = getFirestore();
    if (db) {
      try {
        const q = await db.collection('presence').get();
        const items: any[] = [];
        q.forEach((d:any)=> items.push({ id: d.id, ...(d.data() || {}) }));
        return res.json({ presence: items });
      } catch (e) {
        console.warn('Failed reading presence from firestore', e);
      }
    }

    const items = Array.from(inMemoryPresence.values());
    return res.json({ presence: items });
  } catch (e) {
    console.error('listPresence error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
