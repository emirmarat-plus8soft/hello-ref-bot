const { validateReferralSubmission } = require('../utils/validators');
const { getVacancies } = require('../services/atsService');
const { matchCandidate } = require('../services/aiService');
const { appendReferral } = require('../services/sheetsService');
const { notifyHR, sendConfirmationDM } = require('../services/slackService');

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
    const name = values.candidate_name.value.value.trim();
    const email = values.candidate_email.value.value.trim();
    const telegram = values.candidate_telegram?.value?.value?.trim() || '';
    const whatsapp = values.candidate_whatsapp?.value?.value?.trim() || '';
    const linkedin = values.candidate_linkedin.value.value.trim();
    const profession = values.candidate_profession.value.selected_option.value;
    const cvFiles = values.candidate_cv.value.files || [];
    const relation = values.candidate_relation.value.value.trim();
    const comment = values.candidate_comment?.value?.value?.trim() || '';

    // Run async pipeline without blocking the ack response
    (async () => {
      try {
        const [cvLink, vacancies] = await Promise.all([
          getCvLink(client, cvFiles),
          getVacancies(),
        ]);

        const matchResult = await matchCandidate(
          { name, profession, linkedin, relation, comment },
          vacancies
        );

        await appendReferral({
          name,
          email,
          telegram,
          whatsapp,
          linkedin,
          profession,
          cvLink,
          relation,
          comment,
          matchedVacancy: matchResult.matched ? matchResult.vacancy_title : null,
          matchScore: matchResult.matched ? matchResult.match_score : null,
          referredBySlackId: userId,
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
          comment,
          matchResult,
          referredByUserId: userId,
        });

        await sendConfirmationDM(client, { userId, name, matchResult });
      } catch (err) {
        logger.error('Error processing referral submission:', err);
        try {
          await client.chat.postMessage({
            channel: userId,
            text: `:warning: Your referral for *${name}* was received but we hit an error while processing it. Please contact HR directly.`,
          });
        } catch (dmErr) {
          logger.error('Failed to send error DM:', dmErr);
        }
      }
    })();
  });
};
