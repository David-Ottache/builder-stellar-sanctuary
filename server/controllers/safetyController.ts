import type { Request, Response } from 'express';
import { sendSMS } from '../utils/sms';

export async function sendTestSOS(req: Request, res: Response) {
  try {
    const to = String((req.body && req.body.to) || (req.query && (req.query as any).to) || '').trim();
    const message = String((req.body && req.body.message) || (req.query && (req.query as any).message) || 'Test SOS from reCab');
    if (!to) return res.status(400).json({ error: 'Missing destination phone number (to)' });

    // Normalize to E.164 if possible (basic handling)
    const normalized = to.startsWith('+') ? to : `+${to.replace(/[^0-9]/g, '')}`;

    const ok = await sendSMS(normalized, message);
    if (!ok) return res.status(500).json({ error: 'Failed to send SMS' });

    res.json({ ok: true });
  } catch (e) {
    console.warn('sendTestSOS error', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
