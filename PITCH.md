# HelloRef — Employee Referral Bot

## The Problem

- Referrals are submitted chaotically — messages in random Slack channels, direct DMs to HR, emails
- HR spends time manually collecting, formatting, and logging each referral
- No standard format → missing contacts, no LinkedIn, no explanation of fit
- Candidates get referred without their knowledge or consent
- Duplicate referrals for the same candidate create confusion over who gets the bonus
- No single source of truth — referrals get lost in chat history

---

## What HelloRef Does

A Slack bot that turns a chaotic referral process into a structured, automated pipeline — from submission to HR notification to logging, in seconds.

---

## User Flow

### For the Employee (Referrer)

1. Types `/refer` in any Slack channel
2. A structured modal opens with all required fields:
   - Candidate's name, email, LinkedIn, Telegram/WhatsApp
   - Profession (dropdown of 40+ roles)
   - Resume upload (PDF/DOCX)
   - How they know the candidate
   - Why the candidate is a strong fit
   - Optional comment
   - Two consent checkboxes — confirming the candidate knows about the referral and is open to contact
3. Hits Submit — the modal closes instantly
4. Sees an immediate _"Matching John Doe against open vacancies…"_ message right in the channel, visible only to them, followed by a _"Thanks! Your referral has been submitted."_ confirmation + link to the Referral Policy

### For HR / Recruiters

Immediately after submission, a rich notification lands in the HR channel:

- Full candidate profile (name, profession, contacts, LinkedIn, resume)
- AI-generated candidate summary (2–3 sentences), grounded in the actual resume
- Up to the **top 3 genuinely-fitting vacancies** (only matches scoring ≥ 70%), each ranked by score, so HR can choose — or "Added to Talent Pool" if nothing genuinely fits
- Direct links to each vacancy: ATS candidates page + public vacancy page
- Who referred the candidate (`@SlackName`)
- Link to the full Referrals Google Sheet

---

## What the AI Does

- **Reads the actual resume** — the uploaded PDF/DOCX is parsed to text and treated as the primary source of truth about the candidate's real experience, above the referrer's (possibly biased) notes
- Reads the candidate's profile, referrer's notes, and all open vacancies from the ATS
- Surfaces up to the **top 3 genuinely-fitting vacancies** (score 0–100, only matches ≥ 70 are shown), scoring strictly so unrelated roles aren't suggested
- Explains why the candidate fits each one (or sends them to the talent pool when nothing fits)
- Writes a short professional summary of the candidate
- Runs on **GPT-4o** via OpenAI API

---

## What Gets Logged Automatically

Every referral is appended to a shared Google Sheet with:

| Field                  | Value                           |
| ---------------------- | ------------------------------- |
| Date                   | DD.MM.YYYY                      |
| Full candidate profile | name, email, contacts, LinkedIn |
| Referrer               | Slack display name              |
| Matched vacancy        | title + ATS link + public link  |
| Match score            | numeric                         |
| Why strong fit         | referrer's pitch                |
| Resume link            | Slack file permalink            |

HR and recruiters have a live, always up-to-date referral log — no manual entry.

---

## Key Protections Built In

- **Duplicate prevention** — if a candidate's email is already in the sheet, the submission is rejected and the referrer is notified. First valid submission wins (per policy).
- **Consent gate** — the referrer must check both consent boxes before submitting. Cannot be bypassed.
- **Validation** — all required fields are enforced at the modal level with inline error messages.
- **Graceful errors** — if anything fails in the pipeline, the referrer is notified with instructions to contact HR directly. A resume that can't be parsed never blocks the referral — the match just proceeds on the form data.

---

## What It Brings to the Team

- **Zero HR overhead** on intake — no manual logging, no chasing for missing info
- **Structured data from day one** — every referral has the same format
- **Faster hiring** — AI reads the resume and instantly surfaces the top 3 vacancy matches; HR opens the ATS link in one click
- **Compliance** — consent is confirmed in writing at submission time
- **Transparency** — referrers always know their submission was received; policy link is always attached
- **Audit trail** — Google Sheet is the single source of truth, accessible to the whole HR team

---

## Tech Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Bot framework   | Slack Bolt (Node.js), Socket Mode         |
| AI matching     | OpenAI GPT-4o                             |
| Data storage    | Google Sheets via Service Account         |
| ATS integration | REST API (hellowehire.com)                |
| Hosting         | Any always-on Node.js host (Railway, VPS) |

---

## Built With

This project was designed, coded, tested, and documented end-to-end with the **[Claude Code](https://claude.com/claude-code)** agent (Anthropic) — from the Slack/AI/Sheets pipeline to deployment troubleshooting and these docs.
