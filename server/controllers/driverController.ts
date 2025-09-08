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

    // Send a minimal safe response immediately so the client feels snappy
    const safe = {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      countryCode: driver.countryCode,
    };

    res.status(201).json({ message: "Driver registered", driver: safe });

    // Persist to Firestore and send SMS in background (non-blocking)
    (async () => {
      try {
        if (!isInitialized()) {
          const init = await initializeFirebaseAdmin();
          if (!init.initialized) {
            console.log("Firestore not available after initialization attempt; skipping persistence");
            // still attempt SMS even if Firestore missing
          }
        }

        const db = getFirestore();
        if (db) {
          const docData = Object.fromEntries(
            Object.entries(driver).filter(([, v]) => v !== undefined),
          );
          const docRef = await db.collection("drivers").add(docData);
          console.log("Driver persisted to Firestore with id", docRef.id);
          try { await docRef.update({ id: docRef.id }); } catch (e) { console.warn('Failed to update driver doc id field', e); }

          // try to warm lookup cache by notifying lookup controller (if available)
          try {
            const lookup = await import('./lookupController');
            if (lookup && typeof lookup.setCache === 'function') {
              lookup.setCache(docRef.id, { driver: { id: docRef.id, ...docData } });
            }
          } catch (e) { /* ignore */ }
        } else {
          console.log("Firestore not available; skipping persistence");
        }
      } catch (e) {
        console.warn("Failed to persist driver to Firestore (background):", (e as Error).message || e);
      }

      // Send OTP SMS (best-effort background)
      try {
        await sendSMS(`${countryCode || ""}${phone}`, `Your verification code is ${otpCode}`);
      } catch (e) {
        console.warn('Failed sending OTP SMS (background)', e);
      }
    })();
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

// Simple in-memory rating fallback if Firestore unavailable
const inMemoryDriverRatings: Map<string, { rides: number; rating: number }> = new Map();

export const rateDriver: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stars } = req.body || {};
    const s = Number(stars || 0);
    if (!id) return res.status(400).json({ error: 'driver id required' });
    if (!s || s < 1 || s > 5) return res.status(400).json({ error: 'stars must be 1-5' });

    if (!isInitialized()) {
      try { await initializeFirebaseAdmin(); } catch (e) { /* ignore */ }
    }
    const db = getFirestore();

    if (db) {
      try {
        // add rating doc
        const ratingDoc = { driverId: id, stars: s, createdAt: new Date().toISOString() };
        await db.collection('driverRatings').add(ratingDoc);

        // try update aggregated driver doc
        const docRef = db.collection('drivers').doc(id);
        const doc = await docRef.get().catch(()=>null);
        if (doc && doc.exists) {
          const data: any = doc.data() || {};
          const prevRides = Number(data.rides || 0);
          const prevRating = Number(data.rating || 0);
          const newRides = prevRides + 1;
          const newRating = ((prevRating * prevRides) + s) / newRides;
          await docRef.update({ rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 }).catch(()=>{});
          return res.json({ ok: true, rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 });
        }

        // fallback: try to find by id field
        const q = await db.collection('drivers').where('id','==',id).limit(1).get().catch(()=>null);
        if (q && !q.empty) {
          const d = q.docs[0];
          const data: any = d.data() || {};
          const prevRides = Number(data.rides || 0);
          const prevRating = Number(data.rating || 0);
          const newRides = prevRides + 1;
          const newRating = ((prevRating * prevRides) + s) / newRides;
          await db.collection('drivers').doc(d.id).update({ rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 }).catch(()=>{});
          return res.json({ ok: true, rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 });
        }

        // driver doc not found; record in in-memory map
      } catch (e) {
        console.warn('Failed persisting rating to Firestore', e);
      }
    }

    // in-memory fallback
    const current = inMemoryDriverRatings.get(id) || { rides: 0, rating: 0 };
    const newRides = current.rides + 1;
    const newRating = ((current.rating * current.rides) + s) / newRides;
    inMemoryDriverRatings.set(id, { rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 });
    return res.json({ ok: true, rides: newRides, rating: Math.round((newRating + Number.EPSILON) * 10) / 10 });
  } catch (e) {
    console.error('rateDriver error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
