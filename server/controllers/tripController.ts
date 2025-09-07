import { RequestHandler } from 'express';
import { getFirestore, isInitialized, initializeFirebaseAdmin } from '../config/firebaseAdmin';

export const createTrip: RequestHandler = async (req, res) => {
  try {
    const { userId, pickup, destination, fee, driverId, vehicle, distanceKm, status, startedAt } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!pickup || !destination) return res.status(400).json({ error: 'pickup and destination required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const docRef = db.collection('trips').doc();
    const payload = {
      userId,
      pickup,
      destination,
      fee: Number(fee ?? 0),
      driverId: driverId ?? null,
      vehicle: vehicle ?? null,
      distanceKm: distanceKm ?? null,
      status: status ?? 'ongoing',
      startedAt: startedAt ?? new Date().toISOString(),
    } as any;
    await docRef.set(payload);
    // set id field for convenience
    try { await docRef.update({ id: docRef.id }); } catch {}
    return res.json({ id: docRef.id, trip: { id: docRef.id, ...payload } });
  } catch (e) {
    console.error('createTrip error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const listTrips: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    try {
      const q = await db.collection('trips').where('userId', '==', userId).orderBy('startedAt', 'desc').limit(100).get();
      const trips = q.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      return res.json({ trips });
    } catch (err:any) {
      console.warn('listTrips query failed', err?.message || err);
      if (String(err?.message || '').includes('requires an index')) return res.json({ trips: [] });
      throw err;
    }
  } catch (e) {
    console.error('listTrips error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const listTripsByDriver: RequestHandler = async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    try {
      const q = await db.collection('trips').where('driverId', '==', driverId).orderBy('startedAt', 'desc').limit(100).get();
      const trips = q.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      return res.json({ trips });
    } catch (err:any) {
      console.warn('listTripsByDriver query failed', err?.message || err);
      if (String(err?.message || '').includes('requires an index')) return res.json({ trips: [] });
      throw err;
    }
  } catch (e) {
    console.error('listTripsByDriver error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
