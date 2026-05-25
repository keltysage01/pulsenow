import { callClaude, getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const supabase = getSupabaseAdmin();
    let profile = body.profile || null;
    if (!profile && supabase && session.id && session.id !== 'demo-user') {
      const { data } = await supabase.from('quiz_profiles').select('working_genius_result, four_tendencies_result').eq('profile_id', session.id).maybeSingle();
      profile = data;
    }
    const system = 'You are Pulsenow, a direct insurance sales coach. Return concise JSON with title, insight, and next_action.';
    const user = JSON.stringify({ quizProfile: profile, recentActivity: body.recentActivity || {}, weekOf: body.weekOf || new Date().toISOString().slice(0, 10) });
    const text = await callClaude({ system, user, maxTokens: 500 });
    return sendJson(res, 200, { ok: true, insight: text ? JSON.parse(text.replace(/```json|```/g, '').trim()) : fallbackInsight(profile), mode: text ? 'anthropic' : 'fallback' });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || 'weekly_quiz_insight_failed' });
  }
}

function fallbackInsight(profile) {
  const wg = profile?.working_genius_result?.workingGenius || [];
  const tendency = profile?.four_tendencies_result?.primaryTendency || 'your style';
  return {
    title: 'Weekly coaching angle',
    insight: 'Use ' + (wg.join(' + ') || 'your strongest working lane') + ' with ' + tendency + ' accountability this week.',
    next_action: 'Pick one visible sales activity block and one follow-through checkpoint.',
  };
}
