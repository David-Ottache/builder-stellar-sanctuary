import { RequestHandler } from "express";
import { createDriver } from "../models/driver";
import { sendSMS } from "../utils/sms";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";

export const registerDriver: RequestHandler = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, countryCode } = req.body || {};
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const driver = createDriver({
      firstName,
      lastName,
      email,
      phone,
      countryCode,
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
        const docRef = await db.collection("drivers").add({
          ...driver,
          createdAt: new Date().toISOString(),
        });
        console.log("Driver persisted to Firestore with id", docRef.id);
      } else {
        console.log("Firestore not available; skipping persistence");
      }
    } catch (e) {
      console.warn("Failed to persist driver to Firestore:", (e as Error).message || e);
    }

    // Send a welcome SMS (non-blocking)
    sendSMS(
      `${countryCode || ""}${phone}`,
      `Welcome ${firstName || ""}! Your driver registration was received.`,
    ).catch(() => {});

    res.status(201).json({ message: "Driver registered", driver });
  } catch (err) {
    console.error("registerDriver error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
