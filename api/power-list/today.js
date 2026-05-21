import {
  callClaude,
  getSessionFromRequest,
  getSupabaseAdmin,
  normalizeContact,
  readJson,
  sendJson,
  todayKey,
} from '../_lib/pulse-utils.js';

const demoContacts = [
  { id: 'demo-1', name: 'Jordan Blake', qualifier_score: 6, next_followup_date: todayKey(), phone: '8015550144' },
  { id: 'demo-2', name: 'Taylor Reed', qualifier_score: 6, phone: '8015550199' },
  { id: 'demo-3', name: 'Alex Carter', qualifier_score: 5, phone: '8015550121' },
];

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') return sendJson(res, 200, { ok: true });
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });

    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const supabase = getSupabaseAdmin();
    let contacts = [];

    if (supabase && session.id && session.id !== 'demo-user') {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email, qualifier_score, last_contact_date, next_followup_date, contact_type')
        .eq('owner_user_id', session.id)
        .neq('is_dnc', true)
        .order('qualifier_score', { ascending: false })
        .limit(25);
      contacts = (data || []).map((contact) =>
        normalizeContact({
          ...contact,
          name: [contact.first_name, contact.last_name].filter(Boolean).join(' '),
        }),
      );
    }

    if (contacts.length === 0) contacts = demoContacts.map(normalizeContact);

    const picks = await rankContacts(contacts, session);
    return sendJson(res, 200, {
      picks,
      contacts: picks,
      from_cache: false,
      mode: supabase ? 'supabase' : 'local-preview',
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'power_list_failed' });
  }
}

async function rankContacts(contacts, session) {
  const fallback = contacts
    .map((contact) => {
      let score = Number(contact.qualifier_score || 0) * 10;
      if (contact.next_followup_date && contact.next_followup_date <= todayKey()) score += 80;
      if (!contact.last_contact_date && Number(contact.qualifier_score || 0) >= 5) score += 35;
      return { contact, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item, index) => ({
      id: `rec-${item.contact.id}`,
      recommendation_id: `rec-${item.contact.id}`,
      rank: index + 1,
      reason: item.contact.next_followup_date
        ? 'Follow-up due now'
        : item.contact.qualifier_score >= 6
          ? 'High qualifier and ready for first touch'
          : 'Good relationship touchpoint',
      hook: `Open with something personal, then ask one clear next-step question.`,
      urgency: index < 2 ? 'high' : 'medium',
      contact: item.contact,
      contacts: item.contact,
    }));

  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const user = JSON.stringify({
    agent: session.name || 'Agent',
    today: todayKey(),
    contacts: contacts.slice(0, 20),
  });
  const system =
    'You are Pulsenow, an AI sales coach. Return JSON only with picks: [{contact_id, rank, reason, hook, urgency}]. Rank exactly the best contacts to call today.';
  const text = await callClaude({ system, user, maxTokens: 900 });
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const byId = new Map(contacts.map((contact) => [contact.id, contact]));
    return (parsed.picks || [])
      .map((pick, index) => {
        const contact = byId.get(pick.contact_id);
        if (!contact) return null;
        return {
          id: `rec-${contact.id}`,
          recommendation_id: `rec-${contact.id}`,
          rank: pick.rank || index + 1,
          reason: pick.reason || fallback[index]?.reason || 'Strong call priority',
          hook: pick.hook || fallback[index]?.hook || 'Use a personal opener.',
          urgency: pick.urgency || 'medium',
          contact,
          contacts: contact,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return fallback;
  }
}
