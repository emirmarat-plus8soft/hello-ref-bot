const referralModal = require('../modals/referralModal');

module.exports = function registerReferCommand(app) {
  app.command('/refer', async ({ command, ack, client, logger }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        // Stash the originating channel so the submission handler can post
        // ephemeral (visible-only-to-submitter) feedback back into it.
        view: { ...referralModal, private_metadata: command.channel_id || '' },
      });
    } catch (err) {
      logger.error('Failed to open referral modal:', err);
    }
  });
};
