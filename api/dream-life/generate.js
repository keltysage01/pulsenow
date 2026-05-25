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
        required: ['title', 'area', 'description', 'milestone', 'next_action', 'image_prompt'],
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

    if (prompt.length < 8) return sendJson(res, 400, { error: 'prompt_required' });
    if (prompt.length > 20000) return sendJson(res, 413, { error: 'prompt_too_large' });

    const currentItems = Array.isArray(body.current_items) ? body.current_items : [];
    let mode = process.env.OPENAI_API_KEY ? 'openai' : 'local-preview';
    let note = process.env.OPENAI_API_KEY
      ? 'Dream map generated with OpenAI text intelligence. Image generation is handled by the Supabase worker pack when deployed.'
      : 'OPENAI_API_KEY is not set, so Pulsenow returned a local preview dream map.';
    let profile;
    try {
      profile = await buildDreamProfile(prompt, session, currentItems);
    } catch (error) {
      mode = 'local-preview';
      note = 'OpenAI generation was unavailable, so Pulsenow returned a local preview dream map.';
      profile = buildFallbackProfile(prompt, session, currentItems);
    }
    const items = normalizeDreamItems(profile.items, currentItems);

    const response = {
      ok: true,
      mode,
      profile: {
        center_declaration: profile.center_declaration,
        future_self_summary: profile.future_self_summary,
        categories: items,
      },
      items,
      transcript: transcript || undefined,
      note,
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
  if (!process.env.OPENAI_API_KEY) return buildFallbackProfile(prompt, session, currentItems);

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

    return parseDreamJson(extractOutputText(data)) || buildFallbackProfile(prompt, session, currentItems);
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
  const source = Array.isArray(items) && items.length ? items : buildFallbackProfile('', {}, currentItems).items;
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

function buildFallbackProfile(prompt, session, currentItems) {
  const lower = prompt.toLowerCase();
  const wantsTravel = /travel|trip|beach|vacation|world|family trip/.test(lower);
  const wantsHome = /home|house|space|property|land|kitchen/.test(lower);
  const wantsMoney = /debt|money|income|freedom|financial|save|wealth/.test(lower);

  const items = [
    {
      title: wantsHome ? 'Dream Home' : currentItems[0]?.title || 'Home Base',
      area: 'Home',
      description: 'The place that makes your work feel worth it and gives your family room to breathe.',
      milestone: 'Define the home, location, and monthly number this business needs to support.',
      next_action: 'Write the exact home vision and attach one real photo that matches it.',
      image_prompt: 'bright aspirational family home, calm luxury, morning light, realistic photography',
    },
    {
      title: wantsMoney ? 'Debt Free' : currentItems[1]?.title || 'Financial Margin',
      area: 'Money',
      description: 'Less pressure, more choices, and a business rhythm that funds peace instead of panic.',
      milestone: 'Name the first debt or savings target and the weekly activity that supports it.',
      next_action: 'Pick one financial target and connect it to this week’s contact goal.',
      image_prompt: 'calm financial freedom desk, organized notes, soft aqua and green light, realistic',
    },
    {
      title: wantsTravel ? 'Family Trip' : currentItems[2]?.title || 'People & Memories',
      area: 'Relationships',
      description: 'The people, memories, and experiences this business is meant to protect.',
      milestone: 'Choose one experience you want to create in the next 12 months.',
      next_action: 'Save one image of that experience and write why it matters.',
      image_prompt: 'family travel memory, ocean light, warm connection, aspirational but realistic',
    },
    {
      title: 'Impact Work',
      area: 'Work',
      description: 'A business that helps real people and makes outreach feel connected to purpose.',
      milestone: 'Clarify the type of person you most want to help this quarter.',
      next_action: 'Add three people to your Power List who match that mission.',
      image_prompt: 'purposeful coaching conversation, premium CRM workspace, soft glass light',
    },
    {
      title: 'Daily Rhythm',
      area: 'Rhythm',
      description: 'The simple daily pattern that keeps the dream moving without making life chaotic.',
      milestone: 'Build a repeatable morning or evening block for outreach and follow-up.',
      next_action: 'Schedule one 30-minute contact block for tomorrow.',
      image_prompt: 'peaceful morning routine, planner, phone, soft blue green sunrise',
    },
    {
      title: 'Future Self',
      area: 'Identity',
      description: 'The person you are becoming while you build the dream, not just after you arrive.',
      milestone: 'Write the identity statement you want to operate from this week.',
      next_action: 'Add that statement to your profile bio or vision board.',
      image_prompt: 'confident future self reflection, clean premium light, subtle growth symbolism',
    },
  ];

  return {
    center_declaration: `${session?.name || 'I'} am building a life that feels clear, generous, and free.`,
    future_self_summary: 'Your dream map connects visible goals to the daily actions that make them real.',
    items,
  };
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
