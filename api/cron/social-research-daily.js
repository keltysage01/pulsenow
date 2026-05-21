import { getSupabaseAdmin, sendJson, todayKey } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization
    ? String(req.headers.authorization).replace(/^Bearer\s+/i, '')
    : String(req.query?.secret || '');

  if (configuredSecret && providedSecret !== configuredSecret) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const liveSearchEnabled = Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.SERPAPI_API_KEY);

  if (!supabase) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'local-preview',
      date: todayKey(),
      live_search_enabled: liveSearchEnabled,
      message:
        'Background social research cron is live. Add Supabase plus BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY to persist researched contacts.',
    });
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('id, org_id, owner_user_id, first_name, last_name, phone, email, city, state, notes')
    .eq('is_archived', false)
    .limit(100);

  if (error) return sendJson(res, 500, { error: error.message });

  return sendJson(res, 200, {
    ok: true,
    date: todayKey(),
    live_search_enabled: liveSearchEnabled,
    queued: data ? data.length : 0,
    message:
      'Contacts selected for background research. Persistence of social fields should be mapped once the production schema adds social profile columns.',
  });
}
