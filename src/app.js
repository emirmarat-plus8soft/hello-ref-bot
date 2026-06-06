require('dotenv').config();
const { App } = require('@slack/bolt');

const registerReferCommand = require('./commands/refer');
const registerViewSubmissionHandler = require('./handlers/viewSubmission');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

registerReferCommand(app);
registerViewSubmissionHandler(app);

(async () => {
  await app.start();
  console.log('HelloRef bot is running in Socket Mode');
})();
