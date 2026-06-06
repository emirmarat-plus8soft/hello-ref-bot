# HelloRef — Slack Referral Bot

A Slack bot for Plus8Soft that lets employees refer candidates via a slash command. Referrals are matched against open vacancies using GPT-4o and logged to Google Sheets, with notifications sent to the HR channel.

---

## How it works

1. Employee types `/refer` in any Slack channel where the bot is present
2. A modal opens to fill in candidate details and confirm consent
3. On submit the bot:
   - Checks for duplicate referrals by email
   - Fetches open vacancies from the ATS
   - Uses GPT-4o to match the candidate and generate a summary
   - Logs the referral to Google Sheets
   - Notifies the HR channel with full details and vacancy links
   - DMs the referrer with a simple confirmation

---

## Prerequisites

- Node.js 18+
- A Slack app with Socket Mode enabled
- An OpenAI account
- A Google Cloud project with a service account
- Access to the company ATS API

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd hello-ref
npm install
```

### 2. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Enable **Socket Mode** (Settings → Socket Mode) and generate an App-Level Token with `connections:write` scope — this is your `SLACK_APP_TOKEN`
3. Add a Slash Command: **Slash Commands** → **Create New Command**
   - Command: `/refer`
   - Request URL: any URL (not used in Socket Mode)
4. Add Bot Token Scopes under **OAuth & Permissions** → **Bot Token Scopes**:
   - `commands`, `chat:write`, `im:write`, `files:read`, `users:read`
5. Install the app to your workspace — copy the **Bot User OAuth Token** (`xoxb-`) as `SLACK_BOT_TOKEN`
6. Copy **Signing Secret** from **Basic Information** as `SLACK_SIGNING_SECRET`

### 3. Set up Google Sheets

1. Create a Google Spreadsheet and rename the default tab to **`Referrals`** (exact name, case-sensitive)
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**<GOOGLE_SHEET_ID>**/edit`
3. Go to [console.cloud.google.com](https://console.cloud.google.com):
   - Enable the **Google Sheets API** for your project
   - Create a **Service Account** (IAM & Admin → Service Accounts)
   - Create a JSON key for it (Keys tab → Add Key → JSON) and download it
4. Share the spreadsheet with the service account email as **Editor**
5. From the downloaded JSON, extract:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-1-...
OPENAI_API_KEY=sk-...
HR_CHANNEL_ID=C0XXXXXXX
ATS_API_URL=https://your-ats.com/api/positions
GOOGLE_SHEET_ID=1BxiMV...
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEv...
-----END PRIVATE KEY-----
"
```

> **HR_CHANNEL_ID** — open the channel in Slack web, the ID is the last segment of the URL (e.g. `C0123456789`)

### 5. Add the bot to Slack channels

- Add the bot to the HR channel where notifications should be posted
- Add the bot to any channel where employees will use `/refer` (or install it workspace-wide)

In a channel, type `/invite @YourBotName` or use **Integrations → Add apps**.

### 6. Run

```bash
npm start
```

You should see:
```
HelloRef bot is running in Socket Mode
```

---

## Google Sheet structure

The bot auto-creates headers on the first submission if the sheet is empty. Columns:

| Column | Description |
|---|---|
| Date | ISO timestamp of submission |
| Candidate Name | Full name |
| Email | Candidate email (used for duplicate detection) |
| Telegram | Optional |
| WhatsApp | Optional |
| LinkedIn | Profile URL |
| Profession | Selected from dropdown |
| Resume (Slack link) | Permalink to uploaded file |
| How they know the candidate | Referrer's note |
| Why strong fit | Referrer's pitch |
| Comment | Optional additional note |
| Matched Vacancy | Vacancy title if matched |
| ATS Vacancy URL | Link to candidates page in ATS |
| Public Vacancy URL | Link to public vacancy page |
| Match Score | 0–100, threshold for match is 60 |
| Referred by | Referrer's Slack display name |

---

## Referral Policy

[Employee Referral Program](https://plus8soft.atlassian.net/wiki/spaces/T/pages/862814209/Employee+Referral+Program)

- Standard bonus: **$200** (any role)
- Priority / Sprint bonus: **$400** (announced separately in Slack)
- Bonus paid after **3 months** of employment
- First valid submission wins when multiple employees refer the same candidate
