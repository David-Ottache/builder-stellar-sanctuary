import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { getFirestore, isInitialized, initializeFirebaseAdmin } from '../config/firebaseAdmin';

export const loginUser: RequestHandler = async (req, res) => {
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

    const q = await db.collection('users').where('email', '==', email).limit(1).get();
    if (q.empty) {
      console.warn('loginUser: no user found for email', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const doc = q.docs[0];
    const data: any = doc.data();
    const hash = data.passwordHash;
    if (!hash) {
      console.warn('loginUser: user found but no passwordHash stored for email', email);
      return res.status(400).json({ error: 'no_password', message: 'Account exists but no password set' });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      console.warn('loginUser: password mismatch for email', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const safe = {
      id: doc.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      countryCode: data.countryCode,
      profilePhoto: data.profilePhoto,
      walletBalance: data.walletBalance ?? 0,
    };

    return res.json({ message: 'Logged in', user: safe });
  } catch (e) {
    console.error('loginUser error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
