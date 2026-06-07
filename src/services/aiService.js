require('dotenv').config()
const OpenAI = require('openai')

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Only vacancies scoring >= MATCH_THRESHOLD are surfaced to HR (up to
// MAX_MATCHES of them). Below that the candidate goes to the talent pool with
// no vacancy suggestions, to avoid noisy/irrelevant matches.
const MATCH_THRESHOLD = 70
const MAX_MATCHES = 3

function stripHtml(html) {
	return (html || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

async function matchCandidate(
	{ name, profession, linkedin, relation, fit, comment, resumeText },
	vacancies
) {
	const vacancyList = vacancies
		.map(v => ({
			id: v.id,
			title: v.title,
			level: v.level || '',
			requirements: stripHtml(v.requirements).slice(0, 600),
			responsibilities: stripHtml(v.responsibilities).slice(0, 600),
			description: stripHtml(v.description).slice(0, 600),
			job_type: v.job_type || '',
			work_format: v.work_format || '',
		}))
		.map(
			v =>
				`ID:${v.id} | ${v.title} (${v.level}) | ${v.job_type} ${v.work_format}\nRequirements: ${v.requirements}`
		)
		.join('\n\n')

	const userMessage = [
		`Candidate: ${name}`,
		`Profession: ${profession}`,
		`LinkedIn: ${linkedin}`,
		`Referral note: ${relation}`,
		fit ? `Why strong fit: ${fit}` : '',
		comment ? `Additional comment: ${comment}` : '',
		resumeText
			? `\nResume (extracted from the uploaded file — primary source of truth about the candidate's real experience):\n"""\n${resumeText}\n"""`
			: '\n(No resume text could be extracted from the uploaded file.)',
		'',
		vacancies.length > 0
			? `Open vacancies:\n${vacancyList}`
			: 'There are no open vacancies currently.',
	]
		.filter(Boolean)
		.join('\n')

	const response = await client.chat.completions.create({
		model: 'gpt-4o',
		max_tokens: 1024,
		response_format: { type: 'json_object' },
		messages: [
			{
				role: 'system',
				content: `You are an HR assistant. Given a referred candidate profile (with the referrer's notes and, when available, the text of their resume) and a list of open vacancies, your job is to:
0. When resume text is provided, treat it as the primary source of truth about the candidate's real experience and skills, and weigh it above the referrer's notes. The referrer's notes (including the stated profession) add context but can be biased, aspirational, or wrong.
1. Write a short professional summary of the candidate (2-3 sentences), grounded in the resume when available.
2. Score how well the candidate fits each open vacancy and return ONLY genuinely relevant ones, sorted by match_score descending, at most ${MAX_MATCHES}. Only include real vacancies from the provided list (use their exact ID and title). If no vacancy is a genuine fit, return an empty matches array.

Scoring rules — be strict and realistic, do NOT inflate:
- The score reflects how well the candidate's ACTUAL experience and skills (from the resume) match THIS specific role's requirements — not how impressive the candidate is in general.
- 85-100: strong direct fit, has the core skills and relevant experience for this exact role.
- 70-84: solid fit, meets most core requirements.
- 50-69: partial or adjacent fit, missing core requirements.
- below 50: different discipline or unrelated.
- Different-discipline roles must score low. A tech-support specialist is NOT a fit for Project Manager, QA, or Business Development unless the resume clearly shows those specific skills. Do not match someone to a role just because it is open.
- It is correct and expected to return an empty matches array when nothing genuinely fits.

3. Respond ONLY with valid JSON in this exact shape:
{
  "summary": "<candidate summary>",
  "matches": [
    {
      "vacancy_id": <number>,
      "vacancy_title": "<string>",
      "match_score": <0-100>,
      "match_reason": "<one sentence grounded in the candidate's actual experience>"
    }
  ]
}`,
			},
			{ role: 'user', content: userMessage },
		],
	})

	const text = response.choices[0].message.content.trim()
	const jsonStart = text.indexOf('{')
	const jsonEnd = text.lastIndexOf('}')
	const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))

	const validIds = new Set(vacancies.map(v => v.id))
	const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
		.filter(m => m && validIds.has(m.vacancy_id) && m.match_score >= MATCH_THRESHOLD)
		.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
		.slice(0, MAX_MATCHES)
		.map(m => ({
			vacancy_id: m.vacancy_id,
			vacancy_title: m.vacancy_title,
			match_score: m.match_score,
			match_reason: m.match_reason,
			vacancy_url: `https://hellowehire.com/positions-user/${m.vacancy_id}/candidates`,
		}))

	return {
		summary: parsed.summary || '',
		matches,
		matched: matches.length > 0,
	}
}

module.exports = { matchCandidate, MATCH_THRESHOLD, MAX_MATCHES }
