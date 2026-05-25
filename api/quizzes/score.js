import { buildQuizTodayCard, scoreQuiz } from '../_lib/quiz-engine.js';
import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const quizType = body.quizType || body.quiz_type;
    const result = scoreQuiz(quizType, body.answers || {});
    const supabase = getSupabaseAdmin();
    let todayCard = null;

    if (supabase && session.id && session.id !== 'demo-user') {
      const profileId = session.id;
      const orgId = session.org_id || body.org_id;
      const teamId = session.team_id || body.team_id || null;
      await supabase.from('quiz_attempts').insert({
        profile_id: profileId,
        org_id: orgId,
        team_id: teamId,
        quiz_type: quizType,
        status: 'completed',
        answers: body.answers || {},
        result,
        completed_at: new Date().toISOString(),
      });

      const { data: profile } = await supabase.from('quiz_profiles').select('working_genius_result, four_tendencies_result').eq('profile_id', profileId).maybeSingle();
      todayCard = buildQuizTodayCard(profile?.working_genius_result, profile?.four_tendencies_result);
      if (todayCard) {
        await supabase.from('coach_feed_cards').insert({
          profile_id: profileId,
          card_type: todayCard.cardType,
          title: todayCard.title,
          body: todayCard.body,
          payload: todayCard.payload,
        });
      }
    }

    return sendJson(res, 200, { ok: true, result, todayCard, mode: supabase ? 'supabase' : 'local-preview' });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || 'score_failed' });
  }
}
