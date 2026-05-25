import { getSessionFromRequest, getSupabaseAdmin, readJson, sendJson } from '../_lib/pulse-utils.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const FALLBACK_IMAGES = {
  home: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=80',
  money: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80',
  relationships: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
  travel: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  work: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  rhythm: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
};

const DREAM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['center_declaration', 'future_self_summary', 'items'],
  properties: {
    center_declaration: { type: 'string' },
    future_self_summary: { type: 'string' },
    items: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'area', 'description', 'milestone', 'next_action', 'image_prompt', 'feeling_words'],
        properties: {
          title: { type: 'string' },
          area: { type: 'string' },
          description: { type: 'string' },
          milestone: { type: 'string' },
          next_action: { type: 'string' },
          image_prompt: { type: 'string' },
          feeling_words: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const body = await readJson(req);
    const session = getSessionFromRequest(req, body);
    let prompt = String(body.prompt || '').trim();
    let transcript = '';

    if (!prompt && body.audio_base64) {
      transcript = await transcribeDreamAudio({
        audioBase64: String(body.audio_base64 || ''),
        mimeType: String(body.mime_type || 'audio/webm').slice(0, 80),
      });
      prompt = transcript;
    }

    if (body.transcribe_only) {
      if (!transcript) return sendJson(res, 400, { error: 'audio_required', message: 'Record audio before reviewing a transcript.' });
      if (transcript.length < 8) return sendJson(res, 400, { error: 'empty_transcript', message: 'I did not catch enough speech to build a transcript.' });
      return sendJson(res, 200, { ok: true, transcript });
    }

    if (prompt.length < 8) return sendJson(res, 400, { error: 'prompt_required' });
    if (prompt.length > 20000) return sendJson(res, 413, { error: 'prompt_too_large' });

    const currentItems = Array.isArray(body.current_items) ? body.current_items : [];
    if (!process.env.OPENAI_API_KEY) {
      return sendJson(res, 503, {
        error: 'generation_not_configured',
        message: 'Dream Life generation needs OPENAI_API_KEY before it can create an accurate vision from a real transcript.',
      });
    }

    let profile;
    try {
      profile = await buildDreamProfile(prompt, session, currentItems);
    } catch (error) {
      return sendJson(res, 502, {
        error: 'dream_life_generation_unavailable',
        message: error.message || 'Dream Life generation was unavailable. Nothing was generated from placeholder content.',
      });
    }
    const items = normalizeDreamItems(profile.items, currentItems);

    const response = {
      ok: true,
      mode: 'openai',
      profile: {
        center_declaration: profile.center_declaration,
        future_self_summary: profile.future_self_summary,
        categories: items,
      },
      items,
      transcript: transcript || undefined,
      note: 'Dream map generated from the submitted transcript or text. Image generation is handled by the Supabase worker pack when deployed.',
    };

    persistDreamPreview({ session, prompt, response }).catch(() => {});
    return sendJson(res, 200, response);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'dream_life_generation_failed' });
  }
}

async function transcribeDreamAudio({ audioBase64, mimeType }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('voice_transcription_not_configured');
  if (!audioBase64) throw new Error('audio_required');

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (audioBuffer.length < 1200) throw new Error('audio_too_short');
  if (audioBuffer.length > MAX_AUDIO_BYTES) throw new Error('audio_too_large');

  const extension = mimeType.includes('mp4') || mimeType.includes('aac') ? 'mp4' : 'webm';
  const form = new FormData();
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
  form.append('file', new Blob([audioBuffer], { type: mimeType }), `dream-life-recording.${extension}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'voice_transcription_failed');

    const transcript = String(data.text || '').trim();
    if (!transcript) throw new Error('empty_transcript');
    return transcript;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildDreamProfile(prompt, session, currentItems) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const system = [
    'You are PulseNow Dream Life Builder.',
    'Turn a direct-sales agent dream-life description into a tangible, clickable vision map.',
    'Be specific, emotionally grounded, and practical. Do not promise outcomes.',
    'Each item should represent a life area with one milestone and one next action the agent can take this week.',
    'Return only valid JSON matching the provided schema.',
  ].join(' ');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: JSON.stringify({
              agent_name: session?.name || 'Agent',
              prompt,
              current_items: currentItems.map((item) => ({ title: item.title, url: item.url })),
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'pulsenow_dream_life_map',
            strict: true,
            schema: DREAM_SCHEMA,
          },
        },
        max_output_tokens: 2200,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'OpenAI dream generation failed');
    }

    const parsed = parseDreamJson(extractOutputText(data));
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length < 3) {
      throw new Error('Dream generation returned an incomplete profile.');
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  return (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || part.value || '')
    .join('\n')
    .trim();
}

function parseDreamJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeDreamItems(items, currentItems) {
  const source = Array.isArray(items) ? items : [];
  return source.slice(0, 6).map((item, index) => {
    const title = cleanTitle(item.title || currentItems[index]?.title || `Dream Area ${index + 1}`);
    const area = cleanTitle(item.area || title);
    return {
      id: item.id || `dream-${index + 1}`,
      title,
      area,
      description: cleanSentence(item.description || 'A tangible part of the life you are building.'),
      milestone: cleanSentence(item.milestone || 'Make this visible and measurable.'),
      next_action: cleanSentence(item.next_action || 'Choose one small move and schedule it this week.'),
      image_prompt: cleanSentence(item.image_prompt || `${title}, premium inspiring lifestyle photo, soft natural light`),
      image_url: currentItems[index]?.url || pickImage(area, title),
      feeling_words: Array.isArray(item.feeling_words) ? item.feeling_words.slice(0, 5).map(cleanTitle) : [],
    };
  });
}

function pickImage(area, title) {
  const text = `${area} ${title}`.toLowerCase();
  if (/home|house|property/.test(text)) return FALLBACK_IMAGES.home;
  if (/money|debt|financial|margin|wealth/.test(text)) return FALLBACK_IMAGES.money;
  if (/travel|trip|memory|relationship|family/.test(text)) return FALLBACK_IMAGES.travel;
  if (/work|impact|business|mission/.test(text)) return FALLBACK_IMAGES.work;
  if (/rhythm|daily|routine|body/.test(text)) return FALLBACK_IMAGES.rhythm;
  return FALLBACK_IMAGES.relationships;
}

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 42);
}

function cleanSentence(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

async function persistDreamPreview({ session, prompt, response }) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isUuid(session?.id)) return;

  const { data: dreamSession, error: sessionError } = await supabase
    .from('dream_sessions')
    .insert({
      user_id: session.id,
      org_id: isUuid(session.org_id) ? session.org_id : null,
      status: 'preview_ready',
      title: response.items?.[0]?.title || 'Dream Life Map',
      source_type: 'text',
    })
    .select('id')
    .single();

  if (sessionError || !dreamSession?.id) return;

  await supabase.from('dream_inputs').insert({
    session_id: dreamSession.id,
    user_id: session.id,
    input_type: 'text',
    raw_text: prompt,
  });

  await supabase.from('dream_profiles').insert({
    session_id: dreamSession.id,
    user_id: session.id,
    profile_json: response.profile,
  });

  const rows = (response.items || []).map((item, index) => ({
    session_id: dreamSession.id,
    user_id: session.id,
    category_key: item.area.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    title: item.title,
    summary: item.description,
    milestone: item.milestone,
    next_action: item.next_action,
    sort_order: index,
  }));
  if (rows.length) await supabase.from('dream_categories').insert(rows);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}
