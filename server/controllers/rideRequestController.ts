import type { RequestHandler } from 'express';
import { initializeFirebaseAdmin, isInitialized, getFirestore } from '../config/firebaseAdmin';

// Fallback in-memory store when Firestore is unavailable
const inMemory: Map<string, any> = new Map();

function newId() {
  return `rr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const createRequest: RequestHandler = async (req, res) => {
  try {
    const { driverId, riderId, pickup, destination, pickupCoords, destinationCoords, fare } = req.body || {};
    if (!driverId || !destination) return res.status(400).json({ error: 'driverId and destination are required' });
    const payload = {
      id: '',
      driverId: String(driverId),
      riderId: riderId ? String(riderId) : null,
      pickup: pickup || 'Current location',
      destination,
      pickupCoords: pickupCoords || null,
      destinationCoords: destinationCoords || null,
      fare: typeof fare === 'number' ? Math.round(fare) : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isInitialized()) {
        const db = getFirestore();
        const ref = db.collection('rideRequests').doc();
        payload.id = ref.id;
        await ref.set(payload);
        return res.json({ id: payload.id, request: payload });
      }
    } catch (e) {
      // ignore and fallback
    }

    const id = newId();
    const doc = { ...payload, id };
    inMemory.set(id, doc);
    return res.json({ id, request: doc });
  } catch (e) {
    console.error('createRequest error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const getRequest: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      if (isInitialized()) {
        const db = getFirestore();
        const ref = await db.collection('rideRequests').doc(id).get();
        if (!ref.exists) return res.status(404).json({ error: 'not found' });
        return res.json({ request: { id: ref.id, ...(ref.data()||{}) } });
      }
    } catch (e) {}
    const local = inMemory.get(id);
    if (!local) return res.status(404).json({ error: 'not found' });
    return res.json({ request: local });
  } catch (e) {
    console.error('getRequest error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const listRequestsByDriver: RequestHandler = async (req, res) => {
  try {
    const driverId = String(req.query.driverId || '');
    const status = String(req.query.status || '') || 'pending';
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    try {
      if (isInitialized()) {
        const db = getFirestore();
        const q = await db.collection('rideRequests').where('driverId','==', driverId).where('status','==', status).orderBy('createdAt','desc').get();
        const items: any[] = [];
        q.forEach((d:any)=> items.push({ id: d.id, ...(d.data()||{}) }));
        return res.json({ requests: items });
      }
    } catch (e) {}
    const items = Array.from(inMemory.values()).filter((r:any)=> r.driverId === driverId && r.status === status).sort((a:any,b:any)=> String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ requests: items });
  } catch (e) {
    console.error('listRequestsByDriver error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

const updateStatus = async (id: string, status: 'accepted'|'declined') => {
  const now = new Date().toISOString();
  try {
    if (isInitialized()) {
      const db = getFirestore();
      const ref = db.collection('rideRequests').doc(id);
      await ref.update({ status, updatedAt: now }).catch(async ()=>{ await ref.set({ status, updatedAt: now }, { merge: true }); });
      return true;
    }
  } catch (e) {}
  const doc = inMemory.get(id);
  if (!doc) return false;
  inMemory.set(id, { ...doc, status, updatedAt: now });
  return true;
};

export const acceptRequest: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const ok = await updateStatus(id, 'accepted');
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('acceptRequest error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const declineRequest: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const ok = await updateStatus(id, 'declined');
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('declineRequest error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
