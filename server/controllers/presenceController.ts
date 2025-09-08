import { RequestHandler } from "express";
import { initializeFirebaseAdmin, isInitialized, getFirestore } from "../config/firebaseAdmin";

// In-memory presence fallback
const inMemoryPresence: Map<string, any> = new Map();
const PRESENCE_TTL_MS = 90 * 1000; // 1.5 minutes

async function verifyUserExists(db: any, userId: string) {
  try {
    if (!db) return false;
    // try users/doc and drivers/doc
    const uDoc = await db.collection('users').doc(userId).get().catch(()=>null);
    if (uDoc && uDoc.exists) return true;
    const dDoc = await db.collection('drivers').doc(userId).get().catch(()=>null);
    if (dDoc && dDoc.exists) return true;
    // fallback: query where stored 'id' field equals param
    const uq = await db.collection('users').where('id','==',userId).limit(1).get().catch(()=>null);
    if (uq && !uq.empty) return true;
    const dq = await db.collection('drivers').where('id','==',userId).limit(1).get().catch(()=>null);
    if (dq && !dq.empty) return true;
    return false;
  } catch (e) { return false; }
}

export const setPresence: RequestHandler = async (req, res) => {
  try {
    const headerUser = (req.headers['x-user-id'] || req.headers['x-session-user'] || '') as string;
    const { id: bodyId, lat, lng, online = true } = req.body || {};
    const id = String(bodyId || headerUser || '').trim();
    if (!id) return res.status(400).json({ error: 'id required' });

    // verify user exists (simple auth) if possible
    if (!isInitialized()) {
      try { await initializeFirebaseAdmin(); } catch (e) { /* ignore */ }
    }
    const db = getFirestore();
    if (db) {
      const ok = await verifyUserExists(db, id);
      if (!ok) return res.status(403).json({ error: 'forbidden' });
      try {
        const docRef = db.collection('presence').doc(String(id));
        const payload = { id, lat: lat ?? null, lng: lng ?? null, online: !!online, updatedAt: new Date().toISOString() };
        await docRef.set(payload, { merge: true });
        return res.json({ ok: true });
      } catch (e) {
        console.warn('Failed writing presence to firestore', e);
      }
    }

    // fallback to in-memory
    inMemoryPresence.set(String(id), { id, lat: lat ?? null, lng: lng ?? null, online: !!online, updatedAt: new Date().toISOString() });
    return res.json({ ok: true });
  } catch (e) {
    console.error('setPresence error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const listPresence: RequestHandler = async (req, res) => {
  try {
    const headerUser = (req.headers['x-user-id'] || req.headers['x-session-user'] || '') as string;

    if (!isInitialized()) {
      try { await initializeFirebaseAdmin(); } catch (e) { /* ignore */ }
    }
    const db = getFirestore();

    const cutoff = Date.now() - PRESENCE_TTL_MS;

    if (db) {
      try {
        const q = await db.collection('presence').get();
        const items: any[] = [];
        q.forEach((d:any)=> {
          const data = d.data() || {};
          const updated = Date.parse(data.updatedAt || '') || 0;
          if (updated >= cutoff) {
            items.push({ id: d.id, ...data });
          } else {
            // try removing stale doc
            try { db.collection('presence').doc(d.id).delete().catch(()=>{}); } catch (e) {}
          }
        });
        return res.json({ presence: items });
      } catch (e) {
        console.warn('Failed reading presence from firestore', e);
      }
    }

    // cleanup in-memory
    const items = Array.from(inMemoryPresence.values()).filter((p:any) => {
      const ts = Date.parse(p.updatedAt || '') || 0;
      return ts >= cutoff;
    });

    return res.json({ presence: items });
  } catch (e) {
    console.error('listPresence error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
