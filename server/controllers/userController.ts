import { RequestHandler } from "express";
import { createUser } from "../models/user";
import { sendSMS } from "../utils/sms";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";
import bcrypt from 'bcryptjs';

export const registerUser: RequestHandler = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      countryCode,
      gender,
      location,
      profilePhoto,
      identificationNumber,
      identificationPhoto,
      password,
    } = req.body || {};

    if (!phone) return res.status(400).json({ error: "Phone is required" });

    // hash password if provided
    let passwordHash: string | undefined = undefined;
    if (password) {
      try {
        passwordHash = await bcrypt.hash(password, 10);
      } catch (e) {
        console.warn('Failed hashing password', e);
      }
    }

    // generate OTP
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const user = createUser({
      firstName,
      lastName,
      email,
      phone,
      countryCode,
      gender,
      location,
      profilePhoto,
      identificationNumber,
      identificationPhoto,
      passwordHash,
      otpCode,
      otpExpires,
    });

    // Persist to Firestore if available
    try {
      if (!isInitialized()) {
        const init = await initializeFirebaseAdmin();
        if (!init.initialized) {
          console.log("Firestore not available after initialization attempt; skipping persistence");
        }
      }
      const db = getFirestore();
      if (db) {
        // ensure walletBalance initialized
        const docData = Object.fromEntries(Object.entries({ ...user, walletBalance: 10000 }).filter(([, v]) => v !== undefined));
        const docRef = await db.collection("users").add(docData);
        console.log("User persisted to Firestore with id", docRef.id);
        // set the stored document's id field to the Firestore id to make it stable for lookups
        try { await docRef.update({ id: docRef.id }); } catch (e) { console.warn('Failed to update user doc id field', e); }
        // return the firestore doc id as id as well (so callers can use it)
        return res.status(201).json({ message: "User registered", user: { id: docRef.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, countryCode: user.countryCode, walletBalance: 10000 } });
      } else {
        console.log("Firestore not available; skipping persistence");
      }
    } catch (e) {
      console.warn("Failed to persist user to Firestore:", (e as Error).message || e);
    }

    // Send OTP SMS (non-blocking)
    try {
      await sendSMS(`${countryCode || ""}${phone}`, `Your verification code is ${otpCode}`);
    } catch (e) {
      console.warn('Failed sending OTP SMS', e);
    }

    const safe = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      countryCode: user.countryCode,
      walletBalance: 10000,
    };

    res.status(201).json({ message: "User registered", user: safe });
  } catch (err) {
    console.error("registerUser error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) {
        return res.status(503).json({ error: 'database not available' });
      }
    }

    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    // try as document id
    const docRef = db.collection('users').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const data: any = doc.data();
      return res.json({ user: { id: doc.id, ...data } });
    }

    // fallback: query where stored 'id' field equals param (in case stored id differs)
    const q = await db.collection('users').where('id', '==', id).limit(1).get();
    if (!q.empty) {
      const d = q.docs[0];
      return res.json({ user: { id: d.id, ...(d.data() as any) } });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (e) {
    console.error('getUser error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
