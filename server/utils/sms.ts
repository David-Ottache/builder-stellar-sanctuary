export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (sid && token && from) {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
      const params = new URLSearchParams();
      params.set('To', to);
      params.set('From', from);
      params.set('Body', message);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Authorization': `Basic ${auth}`,
        },
        body: params.toString(),
      });
      if (!res.ok) {
        const text = await res.text().catch(()=> '');
        console.error('Twilio send failed', res.status, text);
        return false;
      }
      const data = await res.json().catch(()=>null);
      console.info('Twilio message sent', data?.sid || '');
      return true;
    }

    // Fallback: no Twilio configured, just log
    console.info(`Sending SMS (mock) to ${to}: ${message}`);
    await new Promise((r) => setTimeout(r, 50));
    return true;
  } catch (err) {
    console.error('sendSMS error', err);
    return false;
  }
}
