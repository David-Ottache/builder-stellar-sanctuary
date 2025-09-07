import { RequestHandler } from "express";
import { createDriver } from "../models/driver";
import { sendSMS } from "../utils/sms";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";

import bcrypt from 'bcryptjs';

export const registerDriver: RequestHandler = async (req, res) => {
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
      driverLicenseNumber,
      driverLicensePhoto,
      vehicleType,
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
    const otpCode = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    const driver = createDriver({
      firstName,
      lastName,
      email,
      phone,
      countryCode,
      gender,
      location,
      profilePhoto,
      driverLicenseNumber,
      driverLicensePhoto,
      vehicleType,
      passwordHash,
      otpCode,
      otpExpires,
    });

    // Persist to Firestore if available
    try {
      // ensure initialized (await initialization to avoid race conditions)
      if (!isInitialized()) {
        const init = await initializeFirebaseAdmin();
        if (!init.initialized) {
          console.log("Firestore not available after initialization attempt; skipping persistence");
        }
      }

      const db = getFirestore();
      if (db) {
        // remove undefined values to avoid Firestore errors
        const docData = Object.fromEntries(
          Object.entries(driver).filter(([, v]) => v !== undefined),
        );
        const docRef = await db.collection("drivers").add(docData);
        console.log("Driver persisted to Firestore with id", docRef.id);
        return res.status(201).json({ message: "Driver registered", driver: { id: docRef.id, firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone, countryCode: driver.countryCode } });
      } else {
        console.log("Firestore not available; skipping persistence");
      }
    } catch (e) {
      console.warn("Failed to persist driver to Firestore:", (e as Error).message || e);
    }

    // Send OTP SMS (non-blocking)
    try {
      await sendSMS(`${countryCode || ""}${phone}`, `Your verification code is ${otpCode}`);
    } catch (e) {
      console.warn('Failed sending OTP SMS', e);
    }

    // Send a minimal safe response (don't include passwordHash or otpCode)
    const safe = {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      countryCode: driver.countryCode,
    };

    res.status(201).json({ message: "Driver registered", driver: safe });
  } catch (err) {
    console.error("registerDriver error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDriver: RequestHandler = async (req, res) => {
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

    const docRef = db.collection('drivers').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const data: any = doc.data();
      return res.json({ driver: { id: doc.id, ...data } });
    }

    const q = await db.collection('drivers').where('id', '==', id).limit(1).get();
    if (!q.empty) {
      const d = q.docs[0];
      return res.json({ driver: { id: d.id, ...(d.data() as any) } });
    }

    return res.status(404).json({ error: 'Driver not found' });
  } catch (e) {
    console.error('getDriver error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
