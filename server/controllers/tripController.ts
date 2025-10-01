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

export const getTripById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    try {
      const doc = await db.collection('trips').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'trip not found' });
      return res.json({ trip: { id: doc.id, ...(doc.data() as any) } });
    } catch (err:any) {
      console.warn('getTripById query failed', err?.message || err);
      return res.status(500).json({ error: 'internal' });
    }
  } catch (e) {
    console.error('getTripById error', e);
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
      // Avoid composite index requirements by not using orderBy in the query.
      const q = await db.collection('trips').where('userId', '==', userId).limit(500).get();
      const trips = q.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      // sort by startedAt desc in memory
      trips.sort((a:any,b:any)=> (b.startedAt ? new Date(b.startedAt).getTime() : 0) - (a.startedAt ? new Date(a.startedAt).getTime() : 0));
      return res.json({ trips });
    } catch (err:any) {
      console.warn('listTrips query failed', err?.message || err);
      return res.json({ trips: [] });
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
      const q = await db.collection('trips').where('driverId', '==', driverId).limit(500).get();
      const trips = q.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      trips.sort((a:any,b:any)=> (b.startedAt ? new Date(b.startedAt).getTime() : 0) - (a.startedAt ? new Date(a.startedAt).getTime() : 0));
      return res.json({ trips });
    } catch (err:any) {
      console.warn('listTripsByDriver query failed', err?.message || err);
      return res.json({ trips: [] });
    }
  } catch (e) {
    console.error('listTripsByDriver error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const rateTrip: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stars } = req.body || {};
    const s = Number(stars || 0);
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!s || s < 1 || s > 5) return res.status(400).json({ error: 'stars must be 1-5' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const tripRef = db.collection('trips').doc(id);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) return res.status(404).json({ error: 'trip not found' });
    await tripRef.update({ rating: s }).catch(()=>{});
    return res.json({ ok: true });
  } catch (e) {
    console.error('rateTrip error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const endTrip: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const bodyFee = Number((req.body && (req.body as any).fee) ?? 0);
    const fee = Number.isFinite(bodyFee) && bodyFee >= 0 ? Math.round(bodyFee) : 0;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const docRef = db.collection('trips').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Trip not found' });
    const data = doc.data() as any;
    if (data.status === 'completed') return res.json({ trip: { id: doc.id, ...data } });

    const pmRaw = (req.body && (req.body as any).paymentMethod) ? String((req.body as any).paymentMethod).toLowerCase() : '';
    const paymentMethod = pmRaw === 'wallet' || pmRaw === 'cash' ? pmRaw : undefined;

    const endedAt = new Date().toISOString();
    const updates: any = { status: 'completed', endedAt };
    if (fee > 0) updates.fee = fee;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    await docRef.set(updates, { merge: true }).catch(()=>{});
    const updated = { id: doc.id, ...data, ...updates } as any;

    try {
      const ts = new Date().toISOString();
      if (updated.userId) await db.collection('notifications').add({ userId: updated.userId, title: 'Trip completed', body: `Trip ${updated.id} completed. Total: ₦${Number(updated.fee||0).toLocaleString()}` , ts, read: false });
      if (updated.driverId) await db.collection('notifications').add({ userId: updated.driverId, title: 'Trip completed', body: `Trip ${updated.id} completed.` , ts, read: false });
    } catch {}

    return res.json({ trip: updated });
  } catch (e) {
    console.error('endTrip error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};

// Append driver GPS point to trip path
export const trackLocation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, speed } = (req.body || {}) as any;
    const a = Number(lat), b = Number(lng);
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!Number.isFinite(a) || !Number.isFinite(b)) return res.status(400).json({ error: 'lat/lng required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const locRef = db.collection('tripLocations').doc(String(id));
    const now = new Date().toISOString();
    const point = { lat: a, lng: b, ts: now, speed: Number(speed || 0) } as any;
    const doc = await locRef.get().catch(()=>null);
    const MAX = 500;
    if (!doc || !doc.exists) {
      await locRef.set({ id: id, path: [point], last: point, updatedAt: now });
    } else {
      const data: any = doc.data() || {};
      const path: any[] = Array.isArray(data.path) ? data.path : [];
      path.push(point);
      while (path.length > MAX) path.shift();
      await locRef.set({ id: id, path, last: point, updatedAt: now }, { merge: true });
    }
    // also mirror last on trip doc for quick lookup
    try { await db.collection('trips').doc(String(id)).set({ lastLocation: { lat: a, lng: b, ts: now } }, { merge: true }); } catch {}
    return res.json({ ok: true });
  } catch (e) {
    console.error('trackLocation error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// Return current trip path for tracking
export const getTrack: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const doc = await db.collection('tripLocations').doc(String(id)).get();
    if (!doc.exists) return res.json({ path: [], last: null, updatedAt: null });
    const data: any = doc.data();
    return res.json({ path: data.path || [], last: data.last || null, updatedAt: data.updatedAt || null });
  } catch (e) {
    console.error('getTrack error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// Create or retrieve a shareable public tracking link
export const shareTracking: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const tripRef = db.collection('trips').doc(String(id));
    const doc = await tripRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Trip not found' });
    let token = (doc.data() as any)?.trackToken as string | undefined;
    if (!token) {
      token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await tripRef.set({ trackToken: token }, { merge: true });
    }
    const origin = (typeof process !== 'undefined' && process.env && (process.env.PUBLIC_ORIGIN || process.env.ORIGIN)) || '';
    const base = origin || '';
    const url = base ? `${base}/track/${encodeURIComponent(String(id))}?t=${token}` : `/track/${encodeURIComponent(String(id))}?t=${token}`;
    return res.json({ url, token });
  } catch (e) {
    console.error('shareTracking error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const averageCost: RequestHandler = async (req, res) => {
  try {
    const from = String(req.query.from || '').toLowerCase();
    const to = String(req.query.to || '').toLowerCase();
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const q = await db.collection('trips').limit(500).get();
    const trips = q.docs.map(d=> ({ id: d.id, ...(d.data() as any) }));
    const matches = trips.filter((t:any)=> typeof t.pickup==='string' && typeof t.destination==='string' && String(t.pickup).toLowerCase().includes(from) && String(t.destination).toLowerCase().includes(to) && Number(t.fee||0) > 0);
    if (!matches.length) return res.json({ average: null, count: 0 });
    const sum = matches.reduce((acc:number,t:any)=> acc + Number(t.fee||0), 0);
    const avg = Math.round(sum / matches.length);
    return res.json({ average: avg, count: matches.length });
  } catch (e) {
    console.error('averageCost error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
