import { detectTeamGaps, tendencyTypes, workingGeniusTypes } from '../_lib/quiz-engine.js';
import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    const body = req.method === 'POST' ? await readJson(req) : {};
    const session = getSessionFromRequest(req, body);
    const teamId = req.query?.team_id || body.team_id || session.team_id;
    const supabase = getSupabaseAdmin();
    if (!supabase || !teamId) {
      return sendJson(res, 200, {
        ok: true,
        mode: 'local-preview',
        summary: {
          teamId: teamId || 'demo-team',
          memberCount: 0,
          workingGeniusCounts: Object.fromEntries(workingGeniusTypes.map((type) => [type, 0])),
          tendencyCounts: Object.fromEntries(tendencyTypes.map((type) => [type, 0])),
          gaps: workingGeniusTypes.map((type) => ({ key: 'no_' + type, severity: 'warning', message: 'No ' + type + ' genius is currently visible on this team. Add an explicit owner for that part of the work.' })),
        },
      });
    }
    const { data: aggregate } = await supabase.from('team_quiz_aggregates').select('*').eq('team_id', teamId).maybeSingle();
    if (aggregate) {
      return sendJson(res, 200, {
        ok: true,
        mode: 'supabase',
        summary: {
          teamId,
          memberCount: Number(aggregate.members_with_any_result || 0),
          workingGeniusCounts: aggregate.working_genius_counts,
          tendencyCounts: aggregate.tendency_counts,
          gaps: Object.entries(aggregate.gap_messages || {}).map(([key, message]) => ({ key, severity: 'warning', message })),
        },
      });
    }
    const { data, error } = await supabase.from('quiz_attempts').select('profile_id, result').eq('team_id', teamId).eq('quiz_type', 'working_genius').eq('status', 'completed');
    if (error) throw error;
    return sendJson(res, 200, { ok: true, mode: 'supabase', summary: { teamId, memberCount: data?.length || 0, gaps: detectTeamGaps(data || []) } });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || 'team_quiz_summary_failed' });
  }
}
