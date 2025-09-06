import { RequestHandler } from "express";
import { createDriver } from "@/server/models/driver";
import { sendSMS } from "@/server/utils/sms";

export const registerDriver: RequestHandler = async (req, res) => {
  try {
    const { email, phone, countryCode } = req.body || {};
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const driver = createDriver({ email, phone, countryCode });

    // Send a welcome SMS (non-blocking)
    sendSMS(`${countryCode || ""}${phone}`, `Welcome! Your driver registration was received.`).catch(() => {});

    res.status(201).json({ message: "Driver registered", driver });
  } catch (err) {
    console.error("registerDriver error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
