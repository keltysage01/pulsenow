import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const hasSupabaseAdmin = Boolean(supabaseUrl && supabaseServiceKey);
export const hasSupabasePublic = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseAdmin() {
  if (!hasSupabaseAdmin) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSupabasePublic() {
  if (!hasSupabasePublic) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader('content-type', 'application/json');
  return res.end(JSON.stringify(payload));
}

export async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getSessionFromRequest(req, body = {}) {
  const encoded = req.headers['x-pulsenow-session'];
  if (encoded && typeof encoded === 'string') {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
      // fall through to body
    }
  }
  return body.session || {
    id: 'demo-user',
    name: 'Demo Agent',
    org_id: '00000000-0000-0000-0000-000000000001',
    role: 'agent',
    level: 'TA',
    agent_code: 'DEMO',
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getTier(points) {
  if (points >= 21) return 'All-the-Timer';
  if (points >= 11) return 'Full Timer';
  if (points >= 4) return 'Part Timer';
  if (points >= 1) return 'Some Timer';
  return 'No Timer';
}

export function actionToField(action) {
  if (action === 'contact_block') return { field: 'calls_warm', amount: 10, points: 1 };
  if (action === 'appt_set') return { field: 'appt1_set', amount: 1, points: 0 };
  if (action === 'fna_complete') return { field: 'fna1', amount: 1, points: 1 };
  if (action === 'partner_added') return { field: 'new_partners', amount: 1, points: 1 };
  return null;
}

export function calculatePoints(fields = {}) {
  const contactIds = [
    'calls_warm',
    'calls_cold',
    'msg_text',
    'msg_linkedin',
    'msg_facebook',
    'msg_instagram',
    'msg_tiktok',
  ];
  const num = (key) => {
    const value = Number(fields[key] || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const totalContacts = contactIds.reduce((sum, key) => sum + num(key), 0);
  const pts =
    Math.floor(totalContacts / 10) +
    num('personal_guests') +
    num('team_guests') +
    num('new_partners') +
    num('fna1') +
    num('fna2') +
    Math.floor(num('referrals') / 10);
  return { pts, totalContacts, tier: getTier(pts) };
}

export async function callClaude({ system, user, maxTokens = 700 }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data && data.error && data.error.message ? data.error.message : 'Claude request failed';
    throw new Error(message);
  }
  return (data.content || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export function normalizeContact(row = {}) {
  const firstName = row.first_name || row.firstName || row.firstname || '';
  const lastName = row.last_name || row.lastName || row.lastname || '';
  const name = row.name || [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed Contact';
  const qualifierScore = Number(row.qualifier_score || row.score || 0);
  return {
    id: row.id || `contact-${Math.random().toString(36).slice(2)}`,
    name,
    first_name: firstName || name.split(' ')[0],
    last_name: lastName || name.split(' ').slice(1).join(' '),
    phone: row.phone || '',
    email: row.email || '',
    stage: row.stage || 'Uncontacted Team Prospects',
    qualifier_score: Number.isFinite(qualifierScore) ? qualifierScore : 0,
    last_contact_date: row.last_contact_date || row.last_contacted_at || '',
    next_followup_date: row.next_followup_date || '',
    reason: row.reason || '',
  };
}
