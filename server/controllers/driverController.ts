import { RequestHandler } from "express";
import { createDriver } from "../models/driver";
import { sendSMS } from "../utils/sms";

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
