import { calculatePoints, callClaude, getSessionFromRequest, readJson, sendJson } from '../_lib/pulse-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    const message = String(body.message || '').trim();
    if (!message) return sendJson(res, 400, { error: 'missing_message' });

    const stats = calculatePoints(body.currentLog || body.fields || {});
    const contacts = Array.isArray(body.contacts) ? body.contacts.slice(0, 20) : [];
    const coachProfile = body.coach_profile || {};
    const system = [
      'You are Pulsenow, a direct and tactical sales coach for a direct-sales agent.',
      'Use the actual numbers provided. Keep replies short, specific, and action-oriented.',
      'When a Coach IQ profile is provided, adapt tone, accountability, and next steps to that profile without over-explaining personality theory.',
      'Never give generic motivation. Tell the agent what to do next today.',
    ].join(' ');
    const user = JSON.stringify({
      agent: session.name || 'Agent',
      session_type: body.session_type || 'tactical',
      message,
      stats,
      contacts,
      coach_profile: coachProfile,
    });

    let reply = null;
    try {
      reply = await callClaude({ system, user, maxTokens: 700 });
    } catch (error) {
      reply = null;
    }

    if (!reply) reply = buildFallbackReply(message, stats, contacts, coachProfile);

    return sendJson(res, 200, {
      ok: true,
      session_id: body.session_id || `coach-${Date.now()}`,
      reply,
      mode: process.env.ANTHROPIC_API_KEY ? 'claude' : 'local-preview',
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'coach_failed' });
  }
}

function buildFallbackReply(message, stats, contacts, coachProfile = {}) {
  const lower = message.toLowerCase();
  const profileLine = buildProfileLine(coachProfile);
  if (lower.includes('call') || lower.includes('who')) {
    const names = contacts.slice(0, 3).map((contact) => contact.name).filter(Boolean).join(', ');
    return names
      ? `Start with ${names}. Call in that order, log the outcome immediately, then set a follow-up date before moving on.${profileLine}`
      : `Add or import contacts first. Once contacts are in, your Power List will tell you exactly who to call.${profileLine}`;
  }
  if (lower.includes('all-the-timer') || lower.includes('timer')) {
    const gap = Math.max(0, 21 - stats.pts);
    return gap === 0
      ? `You are already at All-the-Timer. Protect the week by logging every extra contact, FNA, and recruit touch.${profileLine}`
      : `You need ${gap} more points for All-the-Timer. Fastest path: finish the next 10-contact block, then chase one FNA or new partner.${profileLine}`;
  }
  return `Right now you have ${stats.pts} points and ${stats.totalContacts} contacts. Your clearest next move is one focused 10-contact block, then follow up with the hottest person on the Power List.${profileLine}`;
}

function buildProfileLine(coachProfile) {
  const summary = coachProfile && typeof coachProfile === 'object' ? coachProfile.summary : '';
  if (!summary) return '';
  const results = coachProfile.results || {};
  const guidance = [];
  if (results.enneagram?.watchOut) guidance.push(results.enneagram.watchOut);
  if (results.myers_briggs?.coachingStyle) guidance.push(results.myers_briggs.coachingStyle);
  return ` I am using your Coach IQ profile (${summary})${guidance.length ? `: ${guidance.join(' ')}` : '.'}`;
}
