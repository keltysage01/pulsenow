import { getSessionFromRequest, readJson, sendJson } from '../_lib/pulse-utils.js';

const PROVIDER = process.env.BRAVE_SEARCH_API_KEY
  ? 'brave'
  : process.env.SERPAPI_API_KEY
    ? 'serpapi'
    : 'search-targets';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const body = await readJson(req);
    getSessionFromRequest(req, body);
    const contacts = Array.isArray(body.contacts) ? body.contacts.slice(0, 50) : [];
    if (!contacts.length) return sendJson(res, 400, { error: 'contacts_required' });

    const results = [];
    for (const contact of contacts) {
      // Keep the live lookup bounded so mobile CSV imports do not create runaway cost.
      // The frontend can call this endpoint again for the next batch.
      results.push(await researchContact(contact));
    }

    return sendJson(res, 200, {
      ok: true,
      provider: PROVIDER,
      researched: results.length,
      results,
      note:
        PROVIDER === 'search-targets'
          ? 'Add BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY to enable live web lookup. This response returns organized research targets now.'
          : 'Live search provider enabled.',
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'social_research_failed' });
  }
}

async function researchContact(contact = {}) {
  const name = clean(contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(' '));
  const company = clean(contact.company || contact.business || contact.employer || '');
  const city = clean(contact.city || '');
  const state = clean(contact.state || '');
  const email = clean(contact.email || '');
  const context = [name, company, city, state].filter(Boolean).join(' ');
  const socials = extractExistingSocials(contact);

  const queries = {
    linkedin: queryUrl(`site:linkedin.com/in "${name}" ${company || city || state}`),
    facebook: queryUrl(`site:facebook.com "${name}" ${city || state}`),
    instagram: queryUrl(`site:instagram.com "${name}" ${company || city || state}`),
    tiktok: queryUrl(`site:tiktok.com "${name}" ${city || state}`),
  };

  if (PROVIDER === 'brave' && name) {
    const live = await braveSearch(`${context} LinkedIn Facebook Instagram`);
    mergeSocialsFromSearch(socials, live);
  }

  if (PROVIDER === 'serpapi' && name) {
    const live = await serpSearch(`${context} LinkedIn Facebook Instagram`);
    mergeSocialsFromSearch(socials, live);
  }

  return {
    id: contact.id || '',
    name,
    email,
    company,
    location: [city, state].filter(Boolean).join(', '),
    confidence: scoreConfidence(socials, contact),
    socials,
    research_targets: queries,
  };
}

function clean(value) {
  return String(value || '').trim();
}

function queryUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query.replace(/\s+/g, ' ').trim())}`;
}

function extractExistingSocials(contact) {
  const socialBag = contact.socials && typeof contact.socials === 'object' ? contact.socials : {};
  return {
    linkedin: firstUrl(socialBag.linkedin, contact.linkedin, contact.linkedin_url, contact.linked_in_url),
    facebook: firstUrl(socialBag.facebook, contact.facebook, contact.facebook_url),
    instagram: firstUrl(socialBag.instagram, contact.instagram, contact.instagram_url),
    tiktok: firstUrl(socialBag.tiktok, contact.tiktok, contact.tiktok_url),
  };
}

function firstUrl(...values) {
  const found = values.find((value) => value && String(value).trim());
  if (!found) return '';
  const text = String(found).trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/linkedin\.com|facebook\.com|instagram\.com|tiktok\.com/i.test(text)) return `https://${text.replace(/^\/+/, '')}`;
  return text;
}

function mergeSocialsFromSearch(socials, items) {
  items.forEach((item) => {
    const url = item.url || '';
    if (!socials.linkedin && /linkedin\.com\/in\//i.test(url)) socials.linkedin = url;
    if (!socials.facebook && /facebook\.com\//i.test(url)) socials.facebook = url;
    if (!socials.instagram && /instagram\.com\//i.test(url)) socials.instagram = url;
    if (!socials.tiktok && /tiktok\.com\//i.test(url)) socials.tiktok = url;
  });
}

function scoreConfidence(socials, contact) {
  let score = 20;
  if (contact.email) score += 10;
  if (contact.phone) score += 10;
  if (socials.linkedin) score += 35;
  if (socials.facebook || socials.instagram || socials.tiktok) score += 20;
  return Math.min(95, score);
}

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-subscription-token': process.env.BRAVE_SEARCH_API_KEY,
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return ((data.web && data.web.results) || []).map((item) => ({
    title: item.title || '',
    url: item.url || '',
  }));
}

async function serpSearch(query) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.organic_results || []).slice(0, 8).map((item) => ({
    title: item.title || '',
    url: item.link || '',
  }));
}
