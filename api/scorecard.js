const { Resend } = require('resend');

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      firstName, lastName, email, company, role, companySize,
      challenge, totalScore, strategy, infrastructure, people, operations
    } = req.body;

    if (!firstName || !lastName || !email || !company || !role || !companySize) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tier = totalScore <= 12 ? 'Early Stage'
      : totalScore <= 20 ? 'Building Foundations'
      : totalScore <= 30 ? 'Accelerating'
      : 'AI-Forward';

    // --- Write to Google Sheet via Apps Script ---
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName, lastName, email, company, role, companySize,
        challenge, totalScore, strategy, infrastructure, people, operations,
        source: 'Scorecard'
      })
    });

    // --- Emails via Resend ---
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Notification to David
    await resend.emails.send({
      from: 'Bassin Consulting <notifications@bassinconsulting.com>',
      to: 'david@bassinconsulting.com',
      subject: `New Scorecard Lead: ${firstName} ${lastName} (${company}) — ${totalScore}/40`,
      html: `
        <h2>New AI Readiness Scorecard Submission</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${firstName} ${lastName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company</td><td>${company}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Role</td><td>${role}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Size</td><td>${companySize}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Score</td><td><strong>${totalScore}/40</strong> (${tier})</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Strategy</td><td>${strategy}/10</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Data & Infra</td><td>${infrastructure}/10</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">People & Culture</td><td>${people}/10</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Ops & Governance</td><td>${operations}/10</td></tr>
          ${challenge ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Challenge</td><td>${challenge}</td></tr>` : ''}
        </table>
      `
    });

    // Results email to the lead
    const weakest = Object.entries({ strategy, infrastructure, people, operations })
      .sort((a, b) => a[1] - b[1])[0][0];
    const catLabels = {
      strategy: 'Strategy & Vision',
      infrastructure: 'Data & Infrastructure',
      people: 'People & Culture',
      operations: 'Operations & Governance'
    };
    const recommendations = {
      strategy: 'Start by aligning your leadership team around 2-3 specific business outcomes where AI could have the biggest impact. A clear strategy prevents wasted investment.',
      infrastructure: 'Focus on organizing your existing data — even basic cleanup of spreadsheets and file systems makes AI tools dramatically more effective.',
      people: 'Identify 1-2 team members who are curious about AI and empower them to experiment. Internal champions drive adoption faster than top-down mandates.',
      operations: 'Build a simple framework for evaluating AI tools: what problem does it solve, how will you measure success, and what does "good enough" look like to scale?'
    };

    await resend.emails.send({
      from: 'David Bassin <david@bassinconsulting.com>',
      to: email,
      subject: `Your AI Readiness Score: ${totalScore}/40 — ${tier}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#2A2530;">
          <div style="background:#2A2530;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C07842;margin-bottom:12px;">Your AI Readiness Results</div>
            <div style="font-size:48px;font-weight:800;color:#C07842;">${totalScore}<span style="font-size:20px;color:#8E857E;">/40</span></div>
            <div style="display:inline-block;background:rgba(192,120,66,0.15);color:#C07842;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:8px;">${tier}</div>
          </div>

          <div style="background:#F7F3EE;padding:32px;border-radius:0 0 12px 12px;">
            <h3 style="margin:0 0 16px;font-size:18px;">Category Breakdown</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:8px 0;">Strategy & Vision</td>
                <td style="padding:8px 0;text-align:right;font-weight:700;color:#C07842;">${strategy}/10</td>
              </tr>
              <tr>
                <td style="padding:8px 0;">Data & Infrastructure</td>
                <td style="padding:8px 0;text-align:right;font-weight:700;color:#C07842;">${infrastructure}/10</td>
              </tr>
              <tr>
                <td style="padding:8px 0;">People & Culture</td>
                <td style="padding:8px 0;text-align:right;font-weight:700;color:#C07842;">${people}/10</td>
              </tr>
              <tr>
                <td style="padding:8px 0;">Operations & Governance</td>
                <td style="padding:8px 0;text-align:right;font-weight:700;color:#C07842;">${operations}/10</td>
              </tr>
            </table>

            <div style="background:white;border-radius:8px;padding:20px;margin-top:24px;border-left:3px solid #C07842;">
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C07842;font-weight:700;margin-bottom:8px;">Quick Win: ${catLabels[weakest]}</div>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#2A2530;">${recommendations[weakest]}</p>
            </div>

            <div style="text-align:center;margin-top:32px;">
              <a href="mailto:david@bassinconsulting.com?subject=AI%20Strategy%20Call%20-%20${encodeURIComponent(company)}" style="display:inline-block;background:#C07842;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Book a Free Strategy Call</a>
              <p style="margin-top:12px;font-size:13px;color:#8E857E;">15-20 minutes. No sales pitch — just an honest conversation.</p>
            </div>
          </div>

          <div style="text-align:center;padding:24px;font-size:12px;color:#8E857E;">
            <p>Bassin Consulting — AI Solutions for Small Business</p>
            <p style="font-style:italic;">"The deliverable is not just a tool. It is the understanding."</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ success: true, tier, totalScore });
  } catch (err) {
    console.error('Scorecard API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
