const referralModal = require('../modals/referralModal');

module.exports = function registerReferCommand(app) {
  app.command('/refer', async ({ command, ack, client, logger }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        view: referralModal,
      });
    } catch (err) {
      logger.error('Failed to open referral modal:', err);
    }
  });
};
