import { getQuestions } from '../_lib/quiz-engine.js';
import { sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
    const quizType = req.query?.quiz_type || req.query?.quizType || 'working_genius';
    return sendJson(res, 200, { quizType, questions: getQuestions(quizType), count: getQuestions(quizType).length });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'questions_failed' });
  }
}
