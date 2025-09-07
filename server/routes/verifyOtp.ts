import { RequestHandler } from "express";
import { getFirestore } from "../config/firebaseAdmin";

export const verifyDriverOtp: RequestHandler = async (req, res) => {
  try {
    const { phone, countryCode, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: "phone and code required" });

    const db = getFirestore();
    if (!db) return res.status(503).json({ error: "database not available" });

    // query drivers by phone and code
    const q = await db.collection('drivers').where('phone', '==', phone).where('otpCode', '==', code).get();
    if (q.empty) return res.status(400).json({ error: 'Invalid code or phone' });

    const doc = q.docs[0];
    const data = doc.data() as any;
    const expires = data.otpExpires ? new Date(data.otpExpires).getTime() : 0;
    if (Date.now() > expires) return res.status(400).json({ error: 'OTP expired' });

    // mark verified: remove otp fields
    await doc.ref.update({ otpCode: null, otpExpires: null, verifiedAt: new Date().toISOString() });

    res.json({ message: 'Verified' });
  } catch (e) {
    console.error('verifyDriverOtp error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
