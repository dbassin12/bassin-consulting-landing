# Bassin Consulting — Lead Capture & SEO Upgrade

## What Was Built

### New Files
- **`vercel.json`** — Configures Vercel to run serverless functions from `/api`
- **`api/scorecard.js`** — Backend for scorecard form: writes lead to Google Sheet, sends notification email to David, sends personalized results email to lead
- **`api/contact.js`** — Backend for contact form: writes to Google Sheet, sends notification email to David
- **`robots.txt`** — Tells search engines to crawl the site, points to sitemap
- **`sitemap.xml`** — Lists pages for search engine indexing (index.html + scorecard.html)

### Modified Files
- **`package.json`** — Added `resend` dependency (email service)
- **`scorecard.html`** — Added `name` attributes to all form inputs, rewrote `handleSubmit()` to POST data + scores to `/api/scorecard`, added SEO meta tags (description, canonical, Open Graph), added Vercel Analytics
- **`index.html`** — Replaced final CTA section with a contact form (`#contact`), updated "Book a Free Call" buttons to scroll to contact form instead of mailto:, added JSON-LD structured data (ProfessionalService schema), added canonical tag, added Vercel Analytics

### Google Apps Script (deployed separately)
A script was deployed from the Google Sheet that accepts POST requests and appends rows to a "Leads" tab. This avoids needing Google Cloud service account credentials.

- **Apps Script URL:** `https://script.google.com/a/macros/bassinconsulting.com/s/AKfycbxbzD40tt6CKxVSVlHlhgBltI1ejRvyoLi0GLxEVPNZ2yTLJefIB21ArC1GrTSaB3JM/exec`
- **Google Sheet:** `https://docs.google.com/spreadsheets/d/17dpOUXajIMtbEBh_cDniyx3KvkWyaOBt5KeXhPf1DYE/edit`

### Google Sheet Structure (auto-created on first submission)
The "Leads" tab will have these columns:
| Date | First Name | Last Name | Email | Company | Role | Company Size | AI Challenge | Total Score | Strategy | Data & Infra | People & Culture | Ops & Governance | Source | Status | Follow-up Date | Notes |

---

## What Still Needs To Be Done

### 1. Add Vercel Environment Variables
Go to **Vercel Dashboard → bassin-consulting-landing → Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `GOOGLE_SCRIPT_URL` | `https://script.google.com/a/macros/bassinconsulting.com/s/AKfycbxbzD40tt6CKxVSVlHlhgBltI1ejRvyoLi0GLxEVPNZ2yTLJefIB21ArC1GrTSaB3JM/exec` |
| `RESEND_API_KEY` | *(get from resend.com — see step 2)* |

### 2. Set Up Resend (Email Service)
1. Sign up at **resend.com** (free — 100 emails/day)
2. Go to **Domains** → Add `bassinconsulting.com`
3. Add the DNS records Resend gives you (SPF, DKIM, DMARC) in your domain registrar
4. Wait for verification (usually minutes, sometimes up to 48 hours)
5. Copy the **API Key** from the Resend dashboard → add it as `RESEND_API_KEY` in Vercel env vars

### 3. Enable Vercel Analytics
Go to **Vercel Dashboard → bassin-consulting-landing → Analytics** → Enable it. The tracking script is already added to both pages.

### 4. Push & Deploy
```bash
cd ~/bassin-consulting-landing
git add -A
git commit -m "Add lead capture, contact form, SEO basics"
git push
```
Vercel will auto-deploy on push.

### 5. Verify Everything Works
- [ ] Fill out scorecard → check Google Sheet for new row
- [ ] Submit contact form → check Google Sheet for new row
- [ ] Check that David gets notification emails (requires Resend setup)
- [ ] Check that scorecard leads get results emails (requires Resend setup)
- [ ] Visit `bassinconsulting.com/robots.txt` — should show crawler rules
- [ ] Visit `bassinconsulting.com/sitemap.xml` — should show page list
- [ ] Run Lighthouse audit → SEO score should be 90+

---

## Architecture Overview

```
User fills out Scorecard or Contact Form
  ↓
Client-side JS POSTs to /api/scorecard or /api/contact (Vercel serverless)
  ↓
Serverless function does two things in parallel:
  1. POSTs to Google Apps Script → appends row to Google Sheet
  2. Sends emails via Resend:
     - Notification to david@bassinconsulting.com
     - Results email to the lead (scorecard only)
  ↓
User sees success message
```

## Notes
- Email sending won't work until Resend is set up and domain is verified
- Google Sheet writes will work immediately (Apps Script is already deployed)
- The contact form replaces the old mailto: links in the main CTAs — the footer still has a direct email link for discoverability
- No Google Cloud service account was needed — the Apps Script approach is simpler and works within the Workspace org restrictions
