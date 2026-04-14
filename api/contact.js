const { Resend } = require('resend');

const SHEET_TIMEOUT_MS = 8000;

async function writeToSheet(payload) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) {
    console.warn('[sheet] GOOGLE_SCRIPT_URL not set — skipping sheet write');
    return 'skipped';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[sheet] non-ok response', r.status, r.statusText, body.slice(0, 500));
      return 'failed';
    }
    const json = await r.json().catch(() => null);
    if (json && json.ok === false) {
      console.error('[sheet] Apps Script reported failure', json);
      return 'failed';
    }
    return 'ok';
  } catch (err) {
    if (err && err.name === 'AbortError') {
      console.error(`[sheet] timeout after ${SHEET_TIMEOUT_MS}ms`);
    } else {
      console.error('[sheet] fetch failed', err);
    }
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sheetWrite = await writeToSheet({
    name, email, company, message,
    source: 'Contact Form'
  });

  let emailStatus = 'ok';
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Bassin Consulting <notifications@bassinconsulting.com>',
      to: 'david@bassinconsulting.com',
      subject: `New Contact: ${name}${company ? ` (${company})` : ''}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          ${company ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company</td><td>${company}</td></tr>` : ''}
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Message</td><td>${message}</td></tr>
        </table>
        <p style="margin-top:16px;"><a href="mailto:${email}?subject=Re: Your inquiry to Bassin Consulting">Reply to ${name}</a></p>
      `
    });
  } catch (err) {
    console.error('[email] send failed', err);
    emailStatus = 'failed';
  }

  if (sheetWrite === 'failed' && emailStatus === 'failed') {
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
      sheetWrite,
      email: emailStatus
    });
  }

  return res.status(200).json({ success: true, sheetWrite, email: emailStatus });
};
