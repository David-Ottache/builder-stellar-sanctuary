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
      const fee = Number(tripData.fee || 0);
      const driverId = tripData.driverId;
      let payoutTx: any = null;
      let commissionTx: any = null;

      // Commission rate (fraction). Make configurable via env var COMMISSION_RATE (e.g., 0.2 for 20%)
      const commissionRate = Number(process.env.COMMISSION_RATE ?? 0.2);

      // Prepare refs
      const driverRef = driverId ? db.collection('drivers').doc(driverId) : null;
      const userRef = driverId ? db.collection('users').doc(driverId) : null;
      const platformRef = db.collection('wallets').doc('platform');

      // READ PHASE: read driver/user/platform before performing any writes
      const driverDoc = driverRef ? await t.get(driverRef) : null;
      const userDoc = userRef ? await t.get(userRef) : null;
      const platformDoc = await t.get(platformRef);

      // now perform writes
      const endedAt = new Date().toISOString();
      t.update(docRef, { status: 'completed', endedAt });

      if (driverId && fee > 0) {
        const commission = Math.round((fee * commissionRate));
        const driverShare = Math.max(0, fee - commission);

        if (driverDoc && driverDoc.exists) {
          const d = driverDoc.data() as any;
          const prev = Number(d.walletBalance ?? 0);
          t.update(driverRef, { walletBalance: prev + driverShare });
          const txRef = db.collection('walletTransactions').doc();
          const tx = { to: driverId, amount: driverShare, ts: new Date().toISOString(), type: 'trip_payout', tripId: id } as any;
          t.set(txRef, tx);
          payoutTx = tx;
        } else if (userDoc && userDoc.exists) {
          const u = userDoc.data() as any;
          const prev = Number(u.walletBalance ?? 0);
          t.update(userRef, { walletBalance: prev + driverShare });
          const txRef = db.collection('walletTransactions').doc();
          const tx = { to: driverId, amount: driverShare, ts: new Date().toISOString(), type: 'trip_payout', tripId: id } as any;
          t.set(txRef, tx);
          payoutTx = tx;
        } else {
          const txRef = db.collection('walletTransactions').doc();
          const tx = { to: driverId, amount: driverShare, ts: new Date().toISOString(), type: 'trip_payout', tripId: id, note: 'driver record missing' } as any;
          t.set(txRef, tx);
          payoutTx = tx;
        }

        if (platformDoc && platformDoc.exists) {
          const p = platformDoc.data() as any;
          const prev = Number(p.balance ?? 0);
          t.update(platformRef, { balance: prev + commission });
        } else {
          t.set(platformRef, { balance: commission });
        }
        const commTxRef = db.collection('walletTransactions').doc();
        const ctx = { to: 'platform', amount: commission, ts: new Date().toISOString(), type: 'commission', tripId: id } as any;
        t.set(commTxRef, ctx);
        commissionTx = ctx;
      }

      // Construct updated trip without performing additional reads (reads-before-writes enforced by Firestore)
      const updatedTrip = { id: doc.id, ...(tripData as any), status: 'completed', endedAt } as any;
      const result = { alreadyCompleted: false, trip: updatedTrip, payout: payoutTx, commission: commissionTx };
      return result;
    });

    // best-effort notifications (outside transaction)
    try {
      const ts = new Date().toISOString();
      // notify driver
      if (result.payout && result.trip.driverId) {
        await db.collection('notifications').add({ userId: result.trip.driverId, title: 'Trip completed', body: `You received ₦${result.payout.amount.toLocaleString()}`, ts, read: false });
      }
      // notify passenger/user
      if (result.trip.userId) {
        await db.collection('notifications').add({ userId: result.trip.userId, title: 'Trip completed', body: `Your trip ${result.trip.id} completed. Total: ₦${result.trip.fee?.toLocaleString() || 0}`, ts, read: false });
      }
    } catch (e) {
      console.warn('Failed creating notifications', e);
    }

    if (result && result.alreadyCompleted) return res.json({ trip: result.trip });
    return res.json({ trip: result.trip, payout: result.payout, commission: result.commission });
  } catch (e) {
    console.error('endTrip error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
