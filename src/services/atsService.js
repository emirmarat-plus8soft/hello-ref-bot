require('dotenv').config();

let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getVacancies() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const url = process.env.ATS_API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ATS API error: ${res.status}`);

  const vacancies = await res.json();
  cache = { data: vacancies, fetchedAt: now };
  return vacancies;
}

module.exports = { getVacancies };
