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
        const docData = Object.fromEntries(Object.entries(user).filter(([, v]) => v !== undefined));
        const docRef = await db.collection("users").add(docData);
        console.log("User persisted to Firestore with id", docRef.id);
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
    };

    res.status(201).json({ message: "User registered", user: safe });
  } catch (err) {
    console.error("registerUser error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
