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
      const tx = { from: fromId, to: toId, amount: a, ts: new Date().toISOString() };
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
    const { fromId, toId, amount, note } = req.body || {};
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
    await reqRef.set({ from: fromId, to: toId, amount: a, note: note || null, status: 'pending', ts: new Date().toISOString() });
    return res.json({ message: 'request created', id: reqRef.id });
  } catch (e) {
    console.error('requestFunds error', e);
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
    const q = await db.collection('walletTransactions').where('to', '==', userId).orderBy('ts', 'desc').limit(50).get();
    const tx = q.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
    return res.json({ transactions: tx });
  } catch (e) {
    console.error('getTransactions error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
