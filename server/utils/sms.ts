export async function sendSMS(to: string, message: string): Promise<boolean> {
  // Placeholder: integrate with real provider (Twilio, Nexmo, etc.) via env vars in server/config
  try {
    console.info(`Sending SMS to ${to}: ${message}`);
    // simulate async delay
    await new Promise((r) => setTimeout(r, 200));
    return true;
  } catch (err) {
    console.error("sendSMS error", err);
    return false;
  }
}
