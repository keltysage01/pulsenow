import { hasSupabaseConfig, supabase } from './supabase';

export type DreamInputMode = 'text' | 'audio' | 'wispr_transcript';

export type DreamSession = {
  id: string;
  title: string;
  status: string;
  progress_percent: number;
  current_message?: string | null;
  center_declaration?: string | null;
  future_self_summary?: string | null;
};

export type DreamCategory = {
  id?: string;
  category_key: string;
  display_name: string;
  desire_statement?: string | null;
  present_tense_declaration?: string | null;
  aligned_actions?: string[] | null;
  image_prompt_seed?: string | null;
};

export type DreamAsset = {
  id: string;
  category_key?: string | null;
  asset_kind: string;
  storage_path?: string | null;
  signed_url?: string | null;
  prompt_text?: string | null;
};

export type DreamEvent = {
  id: string;
  event_type: string;
  status?: string | null;
  progress_percent?: number | null;
  message?: string | null;
  created_at?: string;
};

export type DreamBundle = {
  session: DreamSession | null;
  inputs: unknown[];
  profile: { profile_json?: unknown; center_declaration?: string | null; future_self_summary?: string | null } | null;
  categories: DreamCategory[];
  assets: DreamAsset[];
  sheet: { sheet_svg_storage_path?: string | null; sheet_png_storage_path?: string | null; sheet_pdf_storage_path?: string | null } | null;
  events: DreamEvent[];
};

export type DreamPreviewItem = {
  id: string;
  title: string;
  area: string;
  description: string;
  milestone: string;
  next_action: string;
  image_prompt: string;
  image_url: string;
  feeling_words: string[];
};

export type DreamPreview = {
  ok: boolean;
  mode: string;
  note: string;
  profile: {
    center_declaration: string;
    future_self_summary: string;
    categories: DreamPreviewItem[];
  };
  items: DreamPreviewItem[];
};

type UploadUrlResponse = {
  bucket: string;
  path: string;
  signed_upload_url: string;
  token: string;
};

async function requireSupabase() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase is not configured for this environment.');
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) {
    throw new Error('Dream Life Builder needs a Supabase Auth session for the full backend flow.');
  }

  return supabase;
}

async function invokeDreamFunction<T>(name: string, body?: Record<string, unknown>, method?: 'GET') {
  const client = await requireSupabase();

  if (method === 'GET') {
    const { data, error } = await client.functions.invoke<T>(`${name}${body?.query ? String(body.query) : ''}`, {
      method: 'GET',
    });
    if (error) throw new Error(error.message);
    return data as T;
  }

  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (error) throw new Error(error.message);
  return data as T;
}

export async function createDreamSession(title = 'My Dream Life Map') {
  return invokeDreamFunction<{ session: DreamSession }>('dream_create_session', {
    title,
    tone_mode: 'faith_centered',
    visual_style: 'future_by_design',
  });
}

export async function createDreamUploadUrl(sessionId: string, file: File | Blob, contentType = 'audio/webm') {
  const fileExt = contentType.includes('wav') ? 'wav' : contentType.includes('mpeg') || contentType.includes('mp3') ? 'mp3' : 'webm';
  const response = await invokeDreamFunction<UploadUrlResponse>('dream_create_upload_url', {
    session_id: sessionId,
    file_ext: fileExt,
    content_type: contentType,
  });
  const client = await requireSupabase();
  const { error } = await client.storage.from(response.bucket).uploadToSignedUrl(response.path, response.token, file, {
    contentType,
  });
  if (error) throw new Error(error.message);
  return response;
}

export async function submitDreamInput(params: {
  sessionId: string;
  inputType: DreamInputMode;
  text?: string;
  audioPath?: string;
  audioMimeType?: string;
  audioSizeBytes?: number;
}) {
  return invokeDreamFunction<{ input: unknown; job_id: string }>('dream_submit_input', {
    session_id: params.sessionId,
    input_type: params.inputType,
    voice_provider: params.inputType === 'wispr_transcript' ? 'wispr' : params.inputType === 'audio' ? 'native_browser' : 'manual_text',
    raw_text: params.inputType === 'text' ? params.text : undefined,
    transcript_text: params.inputType === 'wispr_transcript' ? params.text : undefined,
    audio_storage_path: params.audioPath,
    audio_mime_type: params.audioMimeType,
    audio_size_bytes: params.audioSizeBytes,
    language: 'en',
  });
}

export async function startDreamBuild(sessionId: string) {
  return invokeDreamFunction<{ job_id: string; status: string }>('dream_start_build', { session_id: sessionId });
}

export async function getDreamSession(sessionId: string) {
  return invokeDreamFunction<DreamBundle>('dream_get_session', { query: `?session_id=${encodeURIComponent(sessionId)}` }, 'GET');
}

export async function regenerateDreamImage(sessionId: string, categoryKey: string, userFeedback: string) {
  return invokeDreamFunction<{ job_id: string; status: string }>('dream_regenerate_image', {
    session_id: sessionId,
    category_key: categoryKey,
    user_feedback: userFeedback,
  });
}

export async function generateDreamPreview(prompt: string, currentItems: unknown[], session: unknown) {
  try {
    const response = await fetch('/api/dream-life/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, current_items: currentItems, session }),
    });
    const payload = (await response.json()) as DreamPreview & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Dream preview failed');
    return payload;
  } catch {
    return buildLocalDreamPreview(prompt);
  }
}

export function canUseDreamBackend() {
  return hasSupabaseConfig && Boolean(supabase);
}

function buildLocalDreamPreview(prompt: string): DreamPreview {
  const lower = prompt.toLowerCase();
  const wantsTravel = /travel|trip|beach|vacation|world|family trip/.test(lower);
  const wantsHome = /home|house|space|property|land|kitchen/.test(lower);
  const wantsMoney = /debt|money|income|freedom|financial|save|wealth/.test(lower);
  const items: DreamPreviewItem[] = [
    {
      id: 'dream-home',
      title: wantsHome ? 'Dream Home' : 'Peaceful Home Base',
      area: 'Home',
      description: 'A calm, beautiful place that makes the work feel worth it.',
      milestone: 'Define the home, location, and monthly number this business needs to support.',
      next_action: 'Save one real image that matches the feeling of home.',
      image_prompt: 'bright aspirational family home, calm luxury, morning light',
      image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=80',
      feeling_words: ['peaceful', 'spacious'],
    },
    {
      id: 'dream-money',
      title: wantsMoney ? 'Debt Free' : 'Financial Margin',
      area: 'Money',
      description: 'Less pressure, more options, and a business rhythm that funds peace.',
      milestone: 'Name the first financial target and the weekly activity that supports it.',
      next_action: 'Tie one money goal to this week’s contact goal.',
      image_prompt: 'calm financial freedom desk, organized notes, ocean glass colors',
      image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80',
      feeling_words: ['clear', 'free'],
    },
    {
      id: 'dream-relationships',
      title: wantsTravel ? 'Family Trip' : 'People And Memories',
      area: 'Relationships',
      description: 'The people and experiences this work is meant to protect.',
      milestone: 'Choose one experience to create in the next 12 months.',
      next_action: 'Write why that experience matters enough to build for.',
      image_prompt: 'family travel memory, ocean light, warm connection',
      image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
      feeling_words: ['connected', 'present'],
    },
    {
      id: 'dream-impact',
      title: 'Impact Work',
      area: 'Purpose',
      description: 'A business that builds confidence, leadership, and service.',
      milestone: 'Name the group of people you want your work to help.',
      next_action: 'Pick one person to encourage or serve this week.',
      image_prompt: 'modern team coaching moment, bright optimistic workspace',
      image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      feeling_words: ['useful', 'strong'],
    },
  ];

  return {
    ok: true,
    mode: 'local-preview',
    note: 'Local preview generated in the browser. Deploy Supabase Auth and Edge Functions for generated images and private sheet assets.',
    profile: {
      center_declaration: 'I build a life that feels peaceful, generous, and free.',
      future_self_summary: 'Your dream map connects visible goals to repeatable weekly action.',
      categories: items,
    },
    items,
  };
}
