require('dotenv').config()
const OpenAI = require('openai')

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function stripHtml(html) {
	return (html || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

async function matchCandidate(
	{ name, profession, linkedin, relation, fit, comment },
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
				content: `You are an HR assistant. Given a referred candidate profile and a list of open vacancies, your job is to:
1. Write a short professional summary of the candidate (2-3 sentences).
2. Find the best matching vacancy if any exists (match_score >= 60 counts as a match).
3. Respond ONLY with valid JSON in this exact shape:
{
  "matched": true | false,
  "vacancy_id": <number or null>,
  "vacancy_title": "<string or null>",
  "match_score": <0-100>,
  "summary": "<candidate summary>",
  "match_reason": "<why they match or why no match>"
}`,
			},
			{ role: 'user', content: userMessage },
		],
	})

	const text = response.choices[0].message.content.trim()
	const jsonStart = text.indexOf('{')
	const jsonEnd = text.lastIndexOf('}')
	const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
	if (parsed.vacancy_id) {
		parsed.vacancy_url = `https://hellowehire.com/positions-user/${parsed.vacancy_id}/candidates`
	} else {
		parsed.vacancy_url = null
	}
	return parsed
}

module.exports = { matchCandidate }
