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
  if (!supabase) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'local-preview',
      message: 'Cron endpoint is live. Add Supabase env vars to generate persisted lists.',
      date: todayKey(),
    });
  }

  const { data: users, error } = await supabase.from('users').select('id, org_id, name').eq('is_active', true);
  if (error) return sendJson(res, 500, { error: error.message });

  return sendJson(res, 200, {
    ok: true,
    date: todayKey(),
    queued: users ? users.length : 0,
    message: 'Daily Power List cron reached the backend. Generation happens on first user load in this adapter.',
  });
}
