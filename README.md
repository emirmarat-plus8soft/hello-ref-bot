# HelloRef — Slack Referral Bot

A Slack bot for Plus8Soft that lets employees refer candidates via a slash command. Uploaded resumes are parsed (PDF/DOCX) and, together with the referral details, matched against open vacancies using GPT-4o — surfacing up to the top 3 genuinely-fitting vacancies (score ≥ 70%). Every referral is logged to Google Sheets, with a rich notification sent to the HR channel.

---

## How it works

1. Employee types `/refer` in any Slack channel where the bot is present
2. A modal opens to fill in candidate details, attach a resume, and confirm consent
3. On submit the bot:
   - Shows the referrer an instant "Matching…" message, visible only to them (ephemeral in-channel, falling back to a DM)
   - Checks for duplicate referrals by email
   - Fetches open vacancies from the ATS
   - **Parses the uploaded resume** (PDF / DOCX / text) and feeds the extracted text to GPT-4o, so the match is based on the candidate's real experience — not just the form
   - Uses GPT-4o to generate a summary and surface up to the **top 3 genuinely-fitting vacancies** (score ≥ 70%); if nothing fits, the candidate goes to the talent pool
   - Logs the referral to Google Sheets (best match)
   - Notifies the HR channel with full details, the matching vacancies and their links
   - Confirms to the referrer

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

> **Deploying to Railway / other PaaS?** Multiline values and `\n` escapes in `GOOGLE_PRIVATE_KEY` often get mangled, causing `ERR_OSSL_UNSUPPORTED` (`DECODER routines::unsupported`) when the bot tries to sign the Google auth token. Use the base64 form instead — see [Rotating the Google key](#rotating-the-google-private-key) below.

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
| Date | Submission date in DD.MM.YYYY format |
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

## Rotating the Google private key

When the service account key changes, regenerate the **base64** value and update
`GOOGLE_PRIVATE_KEY_BASE64` on the host. The code reads this variable first (and
falls back to `GOOGLE_PRIVATE_KEY`); base64 is immune to the newline/quote
mangling that breaks raw PEM keys on Railway and similar platforms.

**1. Generate the base64 string.**

From the downloaded Google JSON key file:

```bash
node -e 'console.log(Buffer.from(require("./path/to/key.json").private_key,"utf8").toString("base64"))'
```

Or, if the key is already in your `.env` as `GOOGLE_PRIVATE_KEY`:

```bash
node -e 'require("dotenv").config(); console.log(Buffer.from((process.env.GOOGLE_PRIVATE_KEY||"").replace(/\\n/g,"\n"),"utf8").toString("base64"))'
```

The output is one long line of letters/digits only — no quotes, spaces, or
newlines.

**2. Set it on the host.** Paste the **entire** string into
`GOOGLE_PRIVATE_KEY_BASE64`, then redeploy. On Railway the web editor may
truncate long values on paste — prefer the CLI to avoid a partial copy:

```bash
railway variables --set "GOOGLE_PRIVATE_KEY_BASE64=$(node -e 'require("dotenv").config(); console.log(Buffer.from((process.env.GOOGLE_PRIVATE_KEY||"").replace(/\\n/g,"\n"),"utf8").toString("base64"))')"
```

**3. Verify the value round-trips** (a correct key decodes back to a PEM with
`BEGIN`/`END` markers):

```bash
node -e 'const s="PASTE_BASE64_HERE"; const k=Buffer.from(s,"base64").toString("utf8"); console.log("len:",k.length,"begin:",k.includes("BEGIN"),"end:",k.includes("END"))'
```

Expect `begin: true` and `end: true`. If `begin` is `false`, the pasted value was
truncated — re-copy the full string.

---

## Referral Policy

[Employee Referral Program](https://plus8soft.atlassian.net/wiki/spaces/T/pages/862814209/Employee+Referral+Program)

- Standard bonus: **$200** (any role)
- Priority / Sprint bonus: **$400** (announced separately in Slack)
- Bonus paid after **3 months** of employment
- First valid submission wins when multiple employees refer the same candidate
