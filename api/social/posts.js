import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

const ALLOWED_TYPES = new Set(['win', 'story', 'shoutout']);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return listPosts(req, res);
    if (req.method === 'POST') return createPost(req, res);
    return sendJson(res, 405, { error: 'method_not_allowed' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'social_posts_failed' });
  }
}

async function listPosts(req, res) {
  const session = getSessionFromRequest(req);
  const supabase = getSupabaseAdmin();
  if (!supabase || !session.org_id) {
    return sendJson(res, 200, { ok: true, mode: 'local-preview', posts: [] });
  }

  const { data, error } = await supabase
    .from('social_posts')
    .select('id,type,title,body,author_name,author_level,profile_id,org_id,reactions,created_at')
    .eq('org_id', session.org_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return sendJson(res, 200, { ok: true, mode: 'supabase', posts: (data || []).map(normalizePost) });
}

async function createPost(req, res) {
  const body = await readJson(req);
  const session = getSessionFromRequest(req, body);
  const type = ALLOWED_TYPES.has(body.type) ? body.type : 'win';
  const title = String(body.title || '').trim().slice(0, 80);
  const postBody = String(body.body || '').trim().slice(0, 700);
  if (!title || !postBody) return sendJson(res, 400, { error: 'missing_post_content' });

  const draft = {
    type,
    title,
    body: postBody,
    author_name: session.name || session.full_name || 'Demo Agent',
    author_level: session.level || '',
    profile_id: session.id && session.id !== 'demo-user' ? session.id : null,
    org_id: session.org_id || null,
    reactions: { fire: 0, congrats: 0, inspired: 0 },
  };

  const supabase = getSupabaseAdmin();
  if (!supabase || !draft.profile_id || !draft.org_id) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'local-preview',
      post: normalizePost({ ...draft, id: `local-${Date.now()}`, created_at: new Date().toISOString() }),
    });
  }

  const { data, error } = await supabase.from('social_posts').insert(draft).select('*').single();
  if (error) throw error;
  return sendJson(res, 200, { ok: true, mode: 'supabase', post: normalizePost(data) });
}

function normalizePost(post) {
  const reactions = post.reactions && typeof post.reactions === 'object' ? post.reactions : {};
  return {
    id: post.id,
    type: ALLOWED_TYPES.has(post.type) ? post.type : 'win',
    title: post.title || 'Untitled win',
    body: post.body || '',
    author_name: post.author_name || 'Demo Agent',
    author_level: post.author_level || '',
    created_at: post.created_at || new Date().toISOString(),
    reactions: {
      fire: Math.max(0, Number(reactions.fire || 0)),
      congrats: Math.max(0, Number(reactions.congrats || 0)),
      inspired: Math.max(0, Number(reactions.inspired || 0)),
    },
    reacted: {},
  };
}
