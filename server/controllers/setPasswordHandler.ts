import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { getFirestore, isInitialized, initializeFirebaseAdmin } from '../config/firebaseAdmin';

export const setDriverPassword: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) {
        return res.status(503).json({ error: 'database not available' });
      }
    }

    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const q = await db.collection('drivers').where('email', '==', email).limit(1).get();
    if (q.empty) return res.status(400).json({ error: 'User not found' });

    const doc = q.docs[0];
    const data: any = doc.data();
    // hash password
    const hash = await bcrypt.hash(password, 10);
    await doc.ref.update({ passwordHash: hash });

    res.json({ message: 'Password set' });
  } catch (e) {
    console.error('setDriverPassword error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
