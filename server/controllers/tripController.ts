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

export const endTrip: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    // run as transaction to update trip and credit driver atomically
    const result = await db.runTransaction(async (t: any) => {
      const docRef = db.collection('trips').doc(id);
      const doc = await t.get(docRef);
      if (!doc.exists) throw new Error('Trip not found');
      const tripData: any = doc.data();
      if (tripData.status === 'completed') {
        return { alreadyCompleted: true, trip: { id: doc.id, ...tripData } };
      }
      const endedAt = new Date().toISOString();
      t.update(docRef, { status: 'completed', endedAt });

      const fee = Number(tripData.fee || 0);
      const driverId = tripData.driverId;
      let payoutTx: any = null;

      if (driverId && fee > 0) {
        // attempt to credit driver in drivers collection
        const driverRef = db.collection('drivers').doc(driverId);
        const driverDoc = await t.get(driverRef);
        if (driverDoc.exists) {
          const d = driverDoc.data() as any;
          const prev = Number(d.walletBalance ?? 0);
          t.update(driverRef, { walletBalance: prev + fee });
          const txRef = db.collection('walletTransactions').doc();
          const tx = { to: driverId, amount: fee, ts: new Date().toISOString(), type: 'trip_payout', tripId: id } as any;
          t.set(txRef, tx);
          payoutTx = tx;
        } else {
          // fallback: try users collection (in case drivers stored as users)
          const userRef = db.collection('users').doc(driverId);
          const userDoc = await t.get(userRef);
          if (userDoc.exists) {
            const u = userDoc.data() as any;
            const prev = Number(u.walletBalance ?? 0);
            t.update(userRef, { walletBalance: prev + fee });
            const txRef = db.collection('walletTransactions').doc();
            const tx = { to: driverId, amount: fee, ts: new Date().toISOString(), type: 'trip_payout', tripId: id } as any;
            t.set(txRef, tx);
            payoutTx = tx;
          } else {
            // Neither driver nor user record found; still record a payout tx for bookkeeping
            const txRef = db.collection('walletTransactions').doc();
            const tx = { to: driverId, amount: fee, ts: new Date().toISOString(), type: 'trip_payout', tripId: id, note: 'driver record missing' } as any;
            t.set(txRef, tx);
            payoutTx = tx;
          }
        }
      }

      const updatedDoc = await t.get(docRef);
      return { alreadyCompleted: false, trip: { id: updatedDoc.id, ...(updatedDoc.data() as any) }, payout: payoutTx };
    });

    if (result && result.alreadyCompleted) return res.json({ trip: result.trip });
    return res.json({ trip: result.trip, payout: result.payout });
  } catch (e) {
    console.error('endTrip error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
