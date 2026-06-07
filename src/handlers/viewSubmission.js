const { validateReferralSubmission } = require('../utils/validators');
const { getVacancies } = require('../services/atsService');
const { matchCandidate } = require('../services/aiService');
const { appendReferral, findReferralByEmail } = require('../services/sheetsService');
const { notifyHR, sendConfirmationDM, sendReferrerMessage, POLICY_LINK } = require('../services/slackService');

async function getCvLink(client, files) {
  if (!files || files.length === 0) return null;
  try {
    const fileId = files[0].id;
    const info = await client.files.info({ file: fileId });
    return info.file?.permalink || info.file?.url_private || null;
  } catch {
    return null;
  }
}

module.exports = function registerViewSubmissionHandler(app) {
  app.view('referral_modal', async ({ ack, body, view, client, logger }) => {
    const values = view.state.values;
    const errors = validateReferralSubmission(values);

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: 'errors', errors });
      return;
    }

    await ack({ response_action: 'clear' });

    const userId = body.user.id;
    const channelId = view.private_metadata || null;
    const name = values.candidate_name.value.value.trim();
    const email = values.candidate_email.value.value.trim();
    const telegram = values.candidate_telegram?.value?.value?.trim() || '';
    const whatsapp = values.candidate_whatsapp?.value?.value?.trim() || '';
    const linkedin = values.candidate_linkedin.value.value.trim();
    const profession = values.candidate_profession.value.selected_option.value;
    const cvFiles = values.candidate_cv.value.files || [];
    const relation = values.candidate_relation.value.value.trim();
    const fit = values.candidate_fit.value.value.trim();
    const comment = values.candidate_comment?.value?.value?.trim() || '';

    // Run async pipeline without blocking the ack response
    (async () => {
      try {
        // Immediate "working on it" feedback, visible only to the submitter.
        await sendReferrerMessage(client, {
          channel: channelId,
          userId,
          text: `:hourglass_flowing_sand: Got it! Matching *${name}* against open vacancies…`,
        });

        const duplicate = await findReferralByEmail(email);
        if (duplicate) {
          await sendReferrerMessage(client, {
            channel: channelId,
            userId,
            text: `:x: Your referral for *${name}* could not be submitted — this candidate was already referred earlier. Per our Referral Policy, the first valid submission applies.\n\n${POLICY_LINK}`,
          });
          return;
        }

        const [cvLink, vacancies] = await Promise.all([
          getCvLink(client, cvFiles),
          getVacancies(),
        ]);

        const [matchResult, userInfo] = await Promise.all([
          matchCandidate({ name, profession, linkedin, relation, fit, comment }, vacancies),
          client.users.info({ user: userId }),
        ]);

        // Enrich each match with its public vacancy URL (built from the ATS
        // `hash` field, which the AI service never sees).
        for (const match of matchResult.matches) {
          const vacancy = vacancies.find((v) => v.id === match.vacancy_id);
          if (vacancy?.hash) {
            match.vacancy_public_url = `https://hellowehire.com/positions/${vacancy.hash}`;
          }
        }

        // The sheet logs only the single best match (top of the sorted list)
        // when it clears the threshold; the rest are shown to HR in Slack.
        const bestMatch = matchResult.matched ? matchResult.matches[0] : null;

        const referredByName = userInfo.user?.real_name || userInfo.user?.name || userId;

        await appendReferral({
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
          matchedVacancy: bestMatch ? bestMatch.vacancy_title : null,
          vacancyUrl: bestMatch ? bestMatch.vacancy_url : null,
          vacancyPublicUrl: bestMatch ? (bestMatch.vacancy_public_url || null) : null,
          matchScore: bestMatch ? bestMatch.match_score : null,
          referredByName,
        });

        await notifyHR(client, {
          name,
          profession,
          email,
          telegram,
          whatsapp,
          linkedin,
          cvLink,
          relation,
          fit,
          comment,
          matchResult,
          referredByUserId: userId,
        });

        await sendConfirmationDM(client, { userId, channel: channelId, name });
      } catch (err) {
        logger.error('Error processing referral submission:', err);
        try {
          await sendReferrerMessage(client, {
            channel: channelId,
            userId,
            text: `:warning: Your referral for *${name}* was received but we hit an error while processing it. Please contact HR directly.\n\n${POLICY_LINK}`,
          });
        } catch (notifyErr) {
          logger.error('Failed to notify referrer of error:', notifyErr);
        }
      }
    })();
  });
};
