import { buildQuizTodayCard, getQuestions, scoreQuiz } from '../_lib/quiz-engine.js';
import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;

  if (action === 'questions') return questionsHandler(req, res);
  if (action === 'attempt') return attemptHandler(req, res);
  if (action === 'score') return scoreHandler(req, res);

  return sendJson(res, 404, { error: 'quiz_route_not_found' });
}

async function questionsHandler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
    const quizType = req.query?.quiz_type || req.query?.quizType || 'working_genius';
    const questions = getQuestions(quizType);
    return sendJson(res, 200, { quizType, questions, count: questions.length });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'questions_failed' });
  }
}

async function attemptHandler(req, res) {
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

async function scoreHandler(req, res) {
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
