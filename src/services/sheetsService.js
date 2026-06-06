require('dotenv').config();
const { google } = require('googleapis');

const SHEET_NAME = 'Referrals';
const HEADERS = [
  'Date',
  'Candidate Name',
  'Email',
  'Telegram',
  'WhatsApp',
  'LinkedIn',
  'Profession',
  'Resume (Slack link)',
  'How they know the candidate',
  'Why strong fit',
  'Comment',
  'Matched Vacancy',
  'ATS Vacancy URL',
  'Public Vacancy URL',
  'Match Score',
  'Referred by',
];

function getAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function ensureHeaders(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:A1`,
  });
  const firstCell = res.data.values?.[0]?.[0];
  if (!firstCell) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

async function findReferralByEmail(email) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:P`,
  });

  const rows = res.data.values || [];
  const normalizedEmail = email.toLowerCase();
  // Skip header row (index 0); email is column index 2
  return rows.slice(1).find((row) => (row[2] || '').toLowerCase() === normalizedEmail) || null;
}

async function appendReferral({
  name,
  email,
  telegram,
  whatsapp,
  linkedin,
  profession,
  cvLink,
  relation,
  fit,
  comment,
  matchedVacancy,
  vacancyUrl,
  vacancyPublicUrl,
  matchScore,
  referredByName,
}) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await ensureHeaders(sheets, spreadsheetId);

  const row = [
    new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    name,
    email,
    telegram || '',
    whatsapp || '',
    linkedin,
    profession,
    cvLink || '',
    relation,
    fit || '',
    comment || '',
    matchedVacancy || '',
    vacancyUrl || '',
    vacancyPublicUrl || '',
    matchScore != null ? String(matchScore) : '',
    referredByName,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

module.exports = { appendReferral, findReferralByEmail };
