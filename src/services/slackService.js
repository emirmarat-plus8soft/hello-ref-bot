require('dotenv').config();

async function notifyHR(client, { name, profession, email, telegram, whatsapp, linkedin, cvLink, relation, fit, comment, matchResult, referredByUserId }) {
  const hasMatch = matchResult?.matched && matchResult?.vacancy_title;

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

  if (hasMatch) {
    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Matched Vacancy:*\n<${matchResult.vacancy_url}|${matchResult.vacancy_title}>` },
        { type: 'mrkdwn', text: `*Match Score:*\n${matchResult.match_score}%` },
      ],
    });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Match Reason:*\n${matchResult.match_reason}` },
    });
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

async function sendConfirmationDM(client, { userId, name, matchResult }) {
  const hasMatch = matchResult?.matched && matchResult?.vacancy_title;

  let text;
  if (hasMatch) {
    text = `:white_check_mark: Thanks! Your referral for *${name}* has been submitted.\nWe found a matching vacancy: *${matchResult.vacancy_title}* (${matchResult.match_score}% match). HR will review it shortly.`;
  } else {
    text = `:white_check_mark: Thanks! Your referral for *${name}* has been submitted.\nNo open vacancy matched right now — the candidate has been added to our Talent Pool and we'll reach out when something opens up.`;
  }

  await client.chat.postMessage({
    channel: userId,
    text,
  });
}

module.exports = { notifyHR, sendConfirmationDM };
