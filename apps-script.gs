// Bassin Consulting — Warm Leads webhook
// Paste into Extensions > Apps Script on the Outreach Pipeline sheet
//   https://docs.google.com/spreadsheets/d/1N53si2hvA30PYjpmjEmrIRcEhM6jYqYE24pAlwSCCXE/edit
// Deploy: Deploy > New deployment > Web app, Execute as "Me", Access "Anyone".
// Copy the /exec URL into Vercel env var GOOGLE_SCRIPT_URL.

const TAB_NAME = 'Warm Leads';

const HEADERS = [
  'Date',
  'Source',
  'First Name',
  'Last Name',
  'Email',
  'Company',
  'Role',
  'Company Size',
  'Message / AI Challenge',
  'Total Score',
  'Strategy',
  'Data & Infra',
  'People & Culture',
  'Ops & Governance',
  'Status',
  'Follow-up Date',
  'Notes'
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const row = mapPayloadToRow(body);
    const sheet = getOrCreateTab();
    sheet.appendRow(row);
    return jsonResponse({ ok: true });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg });
  }
}

function mapPayloadToRow(p) {
  const source = p.source || '';
  const isScorecard = source === 'Scorecard';

  let firstName = p.firstName || '';
  let lastName = p.lastName || '';
  if (!isScorecard && p.name && !firstName) {
    const parts = String(p.name).trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ');
  }

  const message = p.message || p.challenge || '';

  return [
    new Date(),
    source,
    firstName,
    lastName,
    p.email || '',
    p.company || '',
    p.role || '',
    p.companySize || '',
    message,
    isScorecard ? (p.totalScore != null ? p.totalScore : '') : '',
    isScorecard ? (p.strategy != null ? p.strategy : '') : '',
    isScorecard ? (p.infrastructure != null ? p.infrastructure : '') : '',
    isScorecard ? (p.people != null ? p.people : '') : '',
    isScorecard ? (p.operations != null ? p.operations : '') : '',
    'New',
    '',
    ''
  ];
}

function getOrCreateTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run manually from the Apps Script editor to verify both payload shapes
// land as rows in the Warm Leads tab before deploying as a web app.
function smokeTest() {
  const contactPayload = {
    postData: {
      contents: JSON.stringify({
        source: 'Contact Form',
        name: 'Test Contact',
        email: 'test.contact@example.com',
        company: 'Test Co',
        message: 'Smoke test of the contact form path.'
      })
    }
  };
  const scorecardPayload = {
    postData: {
      contents: JSON.stringify({
        source: 'Scorecard',
        firstName: 'Test',
        lastName: 'Scorecard',
        email: 'test.scorecard@example.com',
        company: 'Test Co',
        role: 'CEO',
        companySize: '1-10',
        challenge: 'Smoke test scorecard path.',
        totalScore: 28,
        strategy: 7,
        infrastructure: 6,
        people: 8,
        operations: 7
      })
    }
  };
  Logger.log(doPost(contactPayload).getContent());
  Logger.log(doPost(scorecardPayload).getContent());
}
