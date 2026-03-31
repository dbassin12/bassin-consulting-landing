const { Resend } = require('resend');

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, company, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- Write to Google Sheet via Apps Script ---
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, company, message,
        source: 'Contact Form'
      })
    });

    // --- Notify David ---
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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
