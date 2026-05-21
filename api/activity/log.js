import {
  actionToField,
  calculatePoints,
  getSessionFromRequest,
  getSupabaseAdmin,
  readJson,
  sendJson,
  todayKey,
} from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const action = body.action || fieldToAction(body.field);
    const mapped = actionToField(action);
    if (!mapped) return sendJson(res, 400, { error: 'invalid_action' });

    const currentFields = body.currentLog || body.fields || {};
    const nextFields = {
      ...currentFields,
      [mapped.field]: Number(currentFields[mapped.field] || 0) + mapped.amount,
    };
    const totals = calculatePoints(nextFields);
    const day = todayKey();

    const supabase = getSupabaseAdmin();
    if (supabase && session.id && session.id !== 'demo-user') {
      await supabase.from('activity_logs').upsert(
        {
          user_id: session.id,
          org_id: session.org_id,
          log_date: day,
          ...nextFields,
          pts: totals.pts,
          tier: totals.tier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,log_date' },
      );

      await supabase.from('leaderboard').upsert(
        {
          user_id: session.id,
          org_id: session.org_id,
          period: 'day',
          period_key: day,
          pts: totals.pts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,period,period_key' },
      );
    }

    return sendJson(res, 200, {
      ok: true,
      mode: supabase ? 'supabase' : 'local-preview',
      action,
      field: mapped.field,
      fields: nextFields,
      totals: {
        points_total: totals.pts,
        total_contacts: totals.totalContacts,
        tier: totals.tier,
      },
      tier: totals.tier,
      streak: { current_streak: totals.pts > 0 ? 1 : 0 },
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'activity_log_failed' });
  }
}

function fieldToAction(field) {
  if (field === 'calls_warm' || field === 'calls_cold' || field === 'msg_text') return 'contact_block';
  if (field === 'appt1_set') return 'appt_set';
  if (field === 'fna1') return 'fna_complete';
  if (field === 'new_partners') return 'partner_added';
  return '';
}
