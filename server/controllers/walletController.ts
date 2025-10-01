import { RequestHandler } from 'express';
import { getFirestore, isInitialized, initializeFirebaseAdmin } from '../config/firebaseAdmin';

export const transferFunds: RequestHandler = async (req, res) => {
  try {
    const { fromId, toId, amount } = req.body || {};
    const a = Number(amount || 0);
    if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId required' });
    if (!a || a <= 0) return res.status(400).json({ error: 'amount must be a positive number' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const fromRef = db.collection('users').doc(fromId);
    const toRef = db.collection('users').doc(toId);

    await db.runTransaction(async (t: any) => {
      const fromDoc = await t.get(fromRef);
      if (!fromDoc.exists) throw new Error('from user not found');
      const toDoc = await t.get(toRef);
      if (!toDoc.exists) throw new Error('to user not found');
      const fromData: any = fromDoc.data();
      const toData: any = toDoc.data();
      const fromBal = Number(fromData.walletBalance ?? 0);
      const toBal = Number(toData.walletBalance ?? 0);
      if (fromBal < a) throw new Error('insufficient funds');
      t.update(fromRef, { walletBalance: fromBal - a });
      t.update(toRef, { walletBalance: toBal + a });
      // optionally record transaction
      const tx = { from: fromId, to: toId, amount: a, ts: new Date().toISOString(), type: 'transfer' };
      const txRef = db.collection('walletTransactions').doc();
      t.set(txRef, tx);
    });

    return res.json({ message: 'transfer successful' });
  } catch (e: any) {
    if (String(e.message).includes('insufficient')) return res.status(400).json({ error: 'insufficient_funds' });
    console.error('transferFunds error', e);
    return res.status(500).json({ error: 'Internal error', details: String(e.message || e) });
  }
};

export const topUp: RequestHandler = async (req, res) => {
  try {
    const { userId, amount } = req.body || {};
    const a = Number(amount || 0);
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!a || a <= 0) return res.status(400).json({ error: 'amount must be a positive number' });

    // In production this endpoint should integrate with a payment gateway/bank to charge the user's card
    // For now we simulate success and directly increment walletBalance

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (t: any) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error('user not found');
      const data: any = doc.data();
      const bal = Number(data.walletBalance ?? 0);
      t.update(userRef, { walletBalance: bal + a });
      const txRef = db.collection('walletTransactions').doc();
      t.set(txRef, { to: userId, amount: a, ts: new Date().toISOString(), type: 'topup' });
    });

    return res.json({ message: 'topup queued' });
  } catch (e) {
    console.error('topUp error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const requestFunds: RequestHandler = async (req, res) => {
  try {
    const { fromId, toId, amount, note, tripId } = req.body || {};
    const a = Number(amount || 0);
    if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId required' });
    if (!a || a <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    const reqRef = db.collection('walletRequests').doc();
    await reqRef.set({ from: fromId, to: toId, amount: a, note: note || null, tripId: tripId || null, status: 'pending', ts: new Date().toISOString() });
    return res.json({ message: 'request created', id: reqRef.id });
  } catch (e) {
    console.error('requestFunds error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const listRequests: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    const toQ = await db.collection('walletRequests').where('to','==', userId).limit(100).get().catch(()=>({ docs: [] } as any));
    const fromQ = await db.collection('walletRequests').where('from','==', userId).limit(100).get().catch(()=>({ docs: [] } as any));
    const toReq = (toQ.docs || []).map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
    const fromReq = (fromQ.docs || []).map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
    const reqs = [...toReq, ...fromReq];
    reqs.sort((a:any,b:any)=> String(b.ts||'').localeCompare(String(a.ts||'')));
    return res.json({ requests: reqs.slice(0,200) });
  } catch (e) {
    console.error('listRequests error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const deductFunds: RequestHandler = async (req, res) => {
  try {
    const { userId, amount, tripId, driverId: driverIdBody, note } = req.body || {};
    const a = Number(amount || 0);
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!a || a <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    // Resolve driverId from explicit field or note (format: "driver:<id>")
    let driverId: string | null = driverIdBody || null;
    if (!driverId && typeof note === 'string' && note.startsWith('driver:')) {
      driverId = note.split(':')[1] || null;
    }

    // Load settings for commission
    let commissionPercent = 5;
    let adminUserId: string | undefined;
    try {
      const cfg = await db.collection('config').doc('settings').get();
      const data = (cfg.exists ? (cfg.data() as any) : {}) || {};
      commissionPercent = Number(data?.payments?.commissionPercent ?? 5);
      adminUserId = data?.payments?.adminUserId || undefined;
    } catch {}

    const userRef = db.collection('users').doc(userId);
    const driverRef = driverId ? db.collection('drivers').doc(driverId) : null;
    const adminRef = adminUserId ? db.collection('users').doc(adminUserId) : null;

    await db.runTransaction(async (t: any) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error('user not found');
      const userData: any = userDoc.data();
      const userBal = Number(userData.walletBalance ?? 0);
      if (userBal < a) throw new Error('insufficient funds');

      // Calculate commission and driver payout
      const commission = driverRef && adminRef ? Math.floor((commissionPercent / 100) * a) : 0;
      const payout = driverRef ? (a - commission) : 0;

      // Deduct from rider
      t.update(userRef, { walletBalance: userBal - a });
      const deductTxRef = db.collection('walletTransactions').doc();
      const baseMeta: any = { from: userId, amount: a, ts: new Date().toISOString(), type: 'deduct' };
      if (tripId) baseMeta.tripId = tripId;
      if (note) baseMeta.note = note;
      t.set(deductTxRef, baseMeta);

      // Credit driver with payout when driverId present
      if (driverRef) {
        const dDoc = await t.get(driverRef);
        let dBal = 0;
        if (!dDoc.exists) {
          t.set(driverRef, { id: driverId, walletBalance: 0 }, { merge: true });
          dBal = 0;
        } else {
          const dData: any = dDoc.data();
          dBal = Number(dData.walletBalance ?? dData.balance ?? 0);
        }
        t.update(driverRef, { walletBalance: dBal + payout });
        const payTxRef = db.collection('walletTransactions').doc();
        const payMeta: any = { from: userId, to: driverId, amount: payout, ts: new Date().toISOString(), type: 'payment' };
        if (tripId) payMeta.tripId = tripId;
        t.set(payTxRef, payMeta);
      }

      // Send commission to admin when configured
      if (adminRef && driverRef && commission > 0) {
        const aDoc = await t.get(adminRef);
        if (!aDoc.exists) throw new Error('admin wallet user not found');
        const aData: any = aDoc.data();
        const aBal = Number(aData.walletBalance ?? 0);
        t.update(adminRef, { walletBalance: aBal + commission });
        const comTxRef = db.collection('walletTransactions').doc();
        const comMeta: any = { from: userId, to: adminUserId, amount: commission, ts: new Date().toISOString(), type: 'commission' };
        if (tripId) comMeta.tripId = tripId;
        if (driverId) comMeta.driverId = driverId;
        t.set(comTxRef, comMeta);
      }
      // Mark trip as wallet-paid if tripId present
      if (tripId) {
        const tripRef = db.collection('trips').doc(String(tripId));
        try { t.set(tripRef, { paymentMethod: 'wallet', fee: a, paidAt: new Date().toISOString() }, { merge: true }); } catch {}
      }
    });
    return res.json({ message: 'deducted' });
  } catch (e: any) {
    if (String(e.message).includes('insufficient')) return res.status(400).json({ error: 'insufficient_funds' });
    console.error('deductFunds error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const getTransactions: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) return res.status(503).json({ error: 'database not available' });
    }
    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });
    try {
      // Fetch both incoming (to) and outgoing (from) transactions to show full history
      const toQ = await db.collection('walletTransactions').where('to', '==', userId).limit(200).get().catch(()=>({ docs: [] } as any));
      const fromQ = await db.collection('walletTransactions').where('from', '==', userId).limit(200).get().catch(()=>({ docs: [] } as any));
      const toTx = (toQ.docs || []).map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      const fromTx = (fromQ.docs || []).map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
      const tx = [...toTx, ...fromTx];
      // Sort by timestamp descending
      tx.sort((a:any,b:any)=> {
        const ta = a.ts ? new Date(a.ts).getTime() : 0;
        const tb = b.ts ? new Date(b.ts).getTime() : 0;
        return tb - ta;
      });
      // limit to 200
      return res.json({ transactions: tx.slice(0,200) });
    } catch (err:any) {
      console.warn('getTransactions query failed', err?.message || err);
      return res.json({ transactions: [] });
    }
  } catch (e) {
    console.error('getTransactions error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
