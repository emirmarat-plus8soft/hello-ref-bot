require('dotenv').config();
const { MATCH_THRESHOLD } = require('./aiService');

async function notifyHR(client, { name, profession, email, telegram, whatsapp, linkedin, cvLink, relation, fit, comment, matchResult, referredByUserId }) {
  const matches = matchResult?.matches || [];
  const hasMatch = matchResult?.matched;

  const headerText = hasMatch
    ? ':dart: New Referral — Vacancy Match Found!'
    : ':clipboard: New Referral — Added to Talent Pool';

  const contactParts = [`*Email:* ${email}`];
  if (telegram) contactParts.push(`*Telegram:* ${telegram}`);
  if (whatsapp) contactParts.push(`*WhatsApp:* ${whatsapp}`);

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Candidate:*\n${name}` },
        { type: 'mrkdwn', text: `*Profession:*\n${profession}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: contactParts.join('   |   ') },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*LinkedIn:* ${linkedin}` },
    },
  ];

  if (cvLink) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Resume:* <${cvLink}|View file>` },
    });
  }

  if (matches.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Top vacancy matches* _(ranked by AI — pick the best fit)_` },
    });

    matches.forEach((match, i) => {
      const strong = match.match_score >= MATCH_THRESHOLD;
      const marker = strong ? ':large_green_circle:' : ':white_circle:';
      const label = strong ? 'Strong fit' : 'Weaker fit';

      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*${i + 1}. ${match.vacancy_title}*\n${marker} ${label}` },
          { type: 'mrkdwn', text: `*Match Score:*\n${match.match_score}%` },
        ],
      });

      const vacancyLinks = [`*ATS:* <${match.vacancy_url}|Open in ATS>`];
      if (match.vacancy_public_url) {
        vacancyLinks.push(`*Public:* <${match.vacancy_public_url}|View page>`);
      }
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: vacancyLinks.join('   |   ') },
          { type: 'mrkdwn', text: `_${match.match_reason}_` },
        ],
      });
    });

    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*AI Summary:*\n${matchResult?.summary || '_No summary available_'}` },
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*How they know the candidate:*\n${relation}` },
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*Why strong fit:*\n${fit}` },
  });

  if (comment) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Additional comment:*\n${comment}` },
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `Referred by <@${referredByUserId}>` },
      { type: 'mrkdwn', text: `<https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit|View Referrals Sheet>` },
    ],
  });

  await client.chat.postMessage({
    channel: process.env.HR_CHANNEL_ID,
    text: `${headerText} — ${name} (${profession})`,
    blocks,
  });
}

const POLICY_URL = 'https://plus8soft.atlassian.net/wiki/spaces/T/pages/862814209/Employee+Referral+Program?atlOrigin=eyJpIjoiNDJkYWM3MGQyMDY4NDgyYzhmNzk1ODk0YzM3ZWI2MzEiLCJwIjoiY29uZmx1ZW5jZS1jaGF0cy1pbnQifQ';
const POLICY_LINK = `<${POLICY_URL}|Referral Policy>`;

async function sendConfirmationDM(client, { userId, name }) {
  const text = `:white_check_mark: Thanks! Your referral for *${name}* has been submitted.\n\n${POLICY_LINK}`;

  await client.chat.postMessage({
    channel: userId,
    text,
  });
}

module.exports = { notifyHR, sendConfirmationDM, POLICY_LINK };
