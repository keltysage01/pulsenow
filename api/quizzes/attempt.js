import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  try {
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const supabase = getSupabaseAdmin();
    if (!supabase || !session.id || session.id === 'demo-user') {
      return sendJson(res, 200, { ok: true, mode: 'local-preview', attempt: { id: 'local-' + Date.now(), ...body } });
    }
    if (req.method === 'POST') {
      const payload = {
        profile_id: session.id,
        org_id: session.org_id || body.org_id,
        team_id: session.team_id || body.team_id || null,
        quiz_type: body.quizType || body.quiz_type,
        status: body.status || 'in_progress',
        answers: body.answers || {},
        result: body.result || {},
      };
      const { data, error } = await supabase.from('quiz_attempts').insert(payload).select('*').single();
      if (error) throw error;
      return sendJson(res, 200, { ok: true, mode: 'supabase', attempt: data });
    }
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('quiz_attempts').select('*').eq('profile_id', session.id).order('updated_at', { ascending: false }).limit(10);
      if (error) throw error;
      return sendJson(res, 200, { ok: true, mode: 'supabase', attempts: data || [] });
    }
    return sendJson(res, 405, { error: 'method_not_allowed' });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || 'attempt_failed' });
  }
}
