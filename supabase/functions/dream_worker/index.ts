import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { buildDreamProfileWithOpenAI, generateImageWithOpenAI, transcribeWithOpenAI } from '../_shared/openai.ts';
import { transcribeWithWisprRest } from '../_shared/wispr.ts';
import { buildImagePrompt } from '../_shared/prompts.ts';
import { downloadBlob, makeStoragePath, uploadBytes } from '../_shared/storage.ts';
import { enqueueDreamJob, logDreamEvent, markJobFailure, markJobSuccess } from '../_shared/jobs.ts';
import type { DreamCategory, DreamJob, DreamProfile, ToneMode, VisualStyle } from '../_shared/types.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    assertWorkerSecret(req);
    const supabase = createAdminClient();
    const workerId = crypto.randomUUID();

    const { data: job, error } = await supabase.rpc('claim_next_dream_job', {
      p_worker_id: workerId
    });

    if (error) throw error;
    if (!job) return jsonResponse({ status: 'idle' });

    try {
      const result = await processJob(supabase, job as DreamJob);
      await markJobSuccess({ supabase, jobId: job.id, result });
      return jsonResponse({ status: 'processed', job_id: job.id, result });
    } catch (jobError) {
      await markJobFailure({
        supabase,
        jobId: job.id,
        errorCode: 'JOB_FAILED',
        errorMessage: String(jobError?.message ?? jobError),
        retry: true
      });

      await logDreamEvent({
        supabase,
        sessionId: job.session_id,
        userId: job.user_id,
        jobId: job.id,
        eventType: 'job_failed',
        status: 'failed',
        progressPercent: null,
        message: 'Something interrupted this step. The system will retry if possible.',
        metadata: { error: String(jobError?.message ?? jobError) }
      });

      return jsonResponse({ status: 'failed', job_id: job.id, error: String(jobError?.message ?? jobError) }, 500);
    }
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 401);
  }
});

function assertWorkerSecret(req: Request) {
  const expected = Deno.env.get('DREAM_WORKER_SECRET');
  const actual = req.headers.get('x-dream-worker-secret');
  if (!expected || actual !== expected) {
    throw new Error('Unauthorized worker');
  }
}

async function processJob(supabase: any, job: DreamJob): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case 'TRANSCRIBE_INPUT':
      return await processTranscribeInput(supabase, job);
    case 'BUILD_PROFILE':
      return await processBuildProfile(supabase, job);
    case 'GENERATE_CATEGORY_IMAGE':
      return await processGenerateCategoryImage(supabase, job);
    case 'REGENERATE_CATEGORY_IMAGE':
      return await processRegenerateCategoryImage(supabase, job);
    case 'COMPOSE_SHEET':
      return await processComposeSheet(supabase, job);
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}

async function processTranscribeInput(supabase: any, job: DreamJob) {
  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'transcribing',
    status: 'transcribing',
    progressPercent: 20,
    message: 'Listening to your dream life.'
  });

  const inputId = String(job.payload.input_id);
  const { data: input, error } = await supabase
    .from('dream_inputs')
    .select('*')
    .eq('id', inputId)
    .single();
  if (error || !input) throw new Error('Input not found');
  if (!input.audio_storage_path) throw new Error('Audio input is missing audio_storage_path');

  const audioBlob = await downloadBlob({ supabase, path: input.audio_storage_path });
  const filename = input.audio_storage_path.split('/').pop() ?? 'audio.webm';

  let transcriptResult: { text: string; metadata: Record<string, unknown> };
  const wisprEnabled = Deno.env.get('WISPR_ENABLED') === 'true';
  const canUseWisprRest = wisprEnabled && input.audio_mime_type === 'audio/wav';

  if (input.voice_provider === 'wispr' && canUseWisprRest) {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = bytesToBase64(new Uint8Array(arrayBuffer));
    const wispr = await transcribeWithWisprRest({
      audioBase64: base64,
      language: input.language ? [input.language] : ['en'],
      userId: job.user_id
    });
    transcriptResult = { text: wispr.text, metadata: wispr.metadata };
  } else {
    transcriptResult = await transcribeWithOpenAI(audioBlob, filename);
  }

  const { error: updateError } = await supabase
    .from('dream_inputs')
    .update({
      transcript_text: transcriptResult.text,
      transcript_provider: transcriptResult.metadata.provider ?? 'openai',
      transcript_metadata: transcriptResult.metadata,
      status: 'transcript_ready'
    })
    .eq('id', inputId);
  if (updateError) throw updateError;

  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'transcribed',
    status: 'transcribed',
    progressPercent: 30,
    message: 'Your words have been turned into a transcript.'
  });

  const nextJobId = await enqueueDreamJob({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobType: 'BUILD_PROFILE',
    payload: { input_id: inputId },
    priority: 40
  });

  return { transcript_length: transcriptResult.text.length, next_job_id: nextJobId };
}

async function processBuildProfile(supabase: any, job: DreamJob) {
  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'building_profile',
    status: 'building_profile',
    progressPercent: 40,
    message: 'Organizing your vision into dream life categories.'
  });

  const { data: session, error: sessionError } = await supabase
    .from('dream_sessions')
    .select('*')
    .eq('id', job.session_id)
    .single();
  if (sessionError || !session) throw new Error('Session not found');

  const inputId = job.payload.input_id ? String(job.payload.input_id) : null;
  let inputQuery = supabase
    .from('dream_inputs')
    .select('*')
    .eq('session_id', job.session_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (inputId) inputQuery = supabase.from('dream_inputs').select('*').eq('id', inputId).limit(1);

  const { data: inputs, error: inputError } = await inputQuery;
  if (inputError || !inputs?.[0]) throw new Error('Input not found');

  const input = inputs[0];
  const transcriptText = input.transcript_text ?? input.raw_text;
  if (!transcriptText) throw new Error('No transcript text available');

  const profile = await buildDreamProfileWithOpenAI({
    transcriptText,
    toneMode: session.tone_mode as ToneMode,
    visualStyle: session.visual_style as VisualStyle
  });

  const { error: profileError } = await supabase.from('dream_profiles').insert({
    session_id: job.session_id,
    user_id: job.user_id,
    profile_json: profile,
    center_declaration: profile.center_declaration,
    future_self_summary: profile.future_self_summary,
    safety_notes: profile.safety_notes ?? [],
    missing_questions: profile.missing_information ?? []
  });
  if (profileError) throw profileError;

  await supabase
    .from('dream_sessions')
    .update({
      title: profile.session_title,
      center_declaration: profile.center_declaration,
      future_self_summary: profile.future_self_summary,
      overall_feeling_words: profile.overall_feeling_words,
      missing_information: profile.missing_information,
      status: 'profile_ready',
      progress_percent: 50,
      current_message: 'Your dream profile is ready.'
    })
    .eq('id', job.session_id);

  const categories = normalizeCategories(profile.categories);
  for (const category of categories) {
    const finalPrompt = buildImagePrompt(category, profile.visual_style as VisualStyle);
    await supabase.from('dream_categories').upsert({
      session_id: job.session_id,
      user_id: job.user_id,
      category_key: category.category_key,
      display_name: category.display_name,
      desire_statement: category.desire_statement,
      present_tense_declaration: category.present_tense_declaration,
      feeling_words: category.feeling_words,
      visual_keywords: category.visual_keywords,
      image_prompt_seed: category.image_prompt_seed,
      final_image_prompt: finalPrompt,
      aligned_actions: category.aligned_actions,
      certainty_score: category.certainty_score,
      sort_order: category.sort_order ?? 0,
      is_visible: true
    }, { onConflict: 'session_id,category_key' });
  }

  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'profile_ready',
    status: 'profile_ready',
    progressPercent: 55,
    message: 'Your dream life categories are ready.'
  });

  const imageLimit = Number(Deno.env.get('DREAM_MAX_IMAGES_PER_SESSION') ?? '9');
  const imageCategories = categories
    .filter((c) => c.category_key !== 'unavailable_for')
    .slice(0, imageLimit);

  const imageJobIds: string[] = [];
  for (const category of imageCategories) {
    const imageJobId = await enqueueDreamJob({
      supabase,
      sessionId: job.session_id,
      userId: job.user_id,
      jobType: 'GENERATE_CATEGORY_IMAGE',
      payload: { category_key: category.category_key },
      priority: 60
    });
    imageJobIds.push(imageJobId);
  }

  return { categories_count: categories.length, image_jobs: imageJobIds };
}

async function processGenerateCategoryImage(supabase: any, job: DreamJob) {
  const categoryKey = String(job.payload.category_key);

  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'generating_images',
    status: 'generating_images',
    progressPercent: 65,
    message: `Creating the ${categoryKey} image.`
  });

  const { data: category, error } = await supabase
    .from('dream_categories')
    .select('*')
    .eq('session_id', job.session_id)
    .eq('category_key', categoryKey)
    .single();
  if (error || !category) throw new Error('Category not found');

  const prompt = category.final_image_prompt ?? buildImagePrompt(category, 'future_by_design');
  const image = await generateImageWithOpenAI({ prompt });
  const path = makeStoragePath({
    userId: job.user_id,
    sessionId: job.session_id,
    folder: 'images',
    filename: `${categoryKey}_${Date.now()}.png`
  });

  await uploadBytes({ supabase, path, bytes: image.bytes, contentType: 'image/png', upsert: true });

  const { error: assetError } = await supabase.from('dream_assets').insert({
    session_id: job.session_id,
    user_id: job.user_id,
    category_key: categoryKey,
    asset_kind: 'category_image',
    storage_path: path,
    content_type: 'image/png',
    prompt_text: prompt,
    provider_name: image.metadata.provider,
    generation_status: 'succeeded',
    metadata: image.metadata
  });
  if (assetError) throw assetError;

  await maybeEnqueueComposeSheet(supabase, job);
  return { category_key: categoryKey, storage_path: path };
}

async function processRegenerateCategoryImage(supabase: any, job: DreamJob) {
  const categoryKey = String(job.payload.category_key);
  const userFeedback = String(job.payload.user_feedback ?? 'Make this closer to my dream life.');

  const { data: category, error } = await supabase
    .from('dream_categories')
    .select('*')
    .eq('session_id', job.session_id)
    .eq('category_key', categoryKey)
    .single();
  if (error || !category) throw new Error('Category not found');

  const prompt = `${category.final_image_prompt}\n\nUser change request: ${userFeedback}`;
  const image = await generateImageWithOpenAI({ prompt });
  const path = makeStoragePath({
    userId: job.user_id,
    sessionId: job.session_id,
    folder: 'images',
    filename: `${categoryKey}_regen_${Date.now()}.png`
  });

  await uploadBytes({ supabase, path, bytes: image.bytes, contentType: 'image/png', upsert: true });

  await supabase.from('dream_assets').insert({
    session_id: job.session_id,
    user_id: job.user_id,
    category_key: categoryKey,
    asset_kind: 'category_image',
    storage_path: path,
    content_type: 'image/png',
    prompt_text: prompt,
    provider_name: image.metadata.provider,
    generation_status: 'succeeded',
    metadata: { ...image.metadata, user_feedback: userFeedback }
  });

  await enqueueDreamJob({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobType: 'COMPOSE_SHEET',
    payload: { reason: 'regenerated_image' },
    priority: 80
  });

  return { category_key: categoryKey, storage_path: path };
}

async function maybeEnqueueComposeSheet(supabase: any, job: DreamJob) {
  const imageLimit = Number(Deno.env.get('DREAM_MAX_IMAGES_PER_SESSION') ?? '9');

  const { data: categories } = await supabase
    .from('dream_categories')
    .select('category_key')
    .eq('session_id', job.session_id)
    .eq('is_visible', true)
    .neq('category_key', 'unavailable_for')
    .order('sort_order', { ascending: true })
    .limit(imageLimit);

  const categoryKeys = (categories ?? []).map((c: any) => c.category_key);
  if (categoryKeys.length === 0) return;

  const { data: assets } = await supabase
    .from('dream_assets')
    .select('category_key')
    .eq('session_id', job.session_id)
    .eq('asset_kind', 'category_image')
    .in('category_key', categoryKeys)
    .eq('generation_status', 'succeeded');

  const completeKeys = new Set((assets ?? []).map((a: any) => a.category_key));
  const allComplete = categoryKeys.every((key: string) => completeKeys.has(key));

  if (allComplete) {
    const { data: existingQueued } = await supabase
      .from('dream_jobs')
      .select('id')
      .eq('session_id', job.session_id)
      .eq('job_type', 'COMPOSE_SHEET')
      .in('status', ['queued', 'running'])
      .limit(1);

    if (!existingQueued?.length) {
      await enqueueDreamJob({
        supabase,
        sessionId: job.session_id,
        userId: job.user_id,
        jobType: 'COMPOSE_SHEET',
        payload: { reason: 'all_images_ready' },
        priority: 80
      });
    }
  }
}

async function processComposeSheet(supabase: any, job: DreamJob) {
  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'composing_sheet',
    status: 'composing_sheet',
    progressPercent: 88,
    message: 'Designing your printable Dream Life Map.'
  });

  const { data: profileRow } = await supabase
    .from('dream_profiles')
    .select('*')
    .eq('session_id', job.session_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!profileRow) throw new Error('Profile not found');
  const profile = profileRow.profile_json as DreamProfile;

  const { data: categories } = await supabase
    .from('dream_categories')
    .select('*')
    .eq('session_id', job.session_id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const { data: assets } = await supabase
    .from('dream_assets')
    .select('*')
    .eq('session_id', job.session_id)
    .eq('asset_kind', 'category_image')
    .eq('generation_status', 'succeeded')
    .order('created_at', { ascending: false });

  const latestAssetByCategory = new Map<string, any>();
  for (const asset of assets ?? []) {
    if (!latestAssetByCategory.has(asset.category_key)) {
      latestAssetByCategory.set(asset.category_key, asset);
    }
  }

  const imageDataByCategory: Record<string, string> = {};
  for (const [categoryKey, asset] of latestAssetByCategory.entries()) {
    const blob = await downloadBlob({ supabase, path: asset.storage_path });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    imageDataByCategory[categoryKey] = `data:${asset.content_type ?? 'image/png'};base64,${bytesToBase64(bytes)}`;
  }

  const sheetJson = buildSheetJson(profile, categories ?? [], latestAssetByCategory);
  const svg = buildSheetSvg(profile, categories ?? [], imageDataByCategory);

  const svgPath = makeStoragePath({
    userId: job.user_id,
    sessionId: job.session_id,
    folder: 'sheets',
    filename: `dream_sheet_${Date.now()}.svg`
  });

  const jsonPath = makeStoragePath({
    userId: job.user_id,
    sessionId: job.session_id,
    folder: 'sheets',
    filename: `dream_sheet_${Date.now()}.json`
  });

  await uploadBytes({
    supabase,
    path: svgPath,
    bytes: new TextEncoder().encode(svg),
    contentType: 'image/svg+xml',
    upsert: true
  });

  await uploadBytes({
    supabase,
    path: jsonPath,
    bytes: new TextEncoder().encode(JSON.stringify(sheetJson, null, 2)),
    contentType: 'application/json',
    upsert: true
  });

  await supabase.from('dream_assets').insert([
    {
      session_id: job.session_id,
      user_id: job.user_id,
      asset_kind: 'sheet_svg',
      storage_path: svgPath,
      content_type: 'image/svg+xml',
      provider_name: 'internal_svg_renderer',
      generation_status: 'succeeded'
    },
    {
      session_id: job.session_id,
      user_id: job.user_id,
      asset_kind: 'sheet_json',
      storage_path: jsonPath,
      content_type: 'application/json',
      provider_name: 'internal_json_renderer',
      generation_status: 'succeeded'
    }
  ]);

  await supabase.from('dream_sheets').insert({
    session_id: job.session_id,
    user_id: job.user_id,
    template_name: 'future_by_design_letter_grid',
    sheet_json: sheetJson,
    sheet_svg_storage_path: svgPath,
    status: 'sheet_ready'
  });

  await supabase
    .from('dream_sessions')
    .update({
      status: 'sheet_ready',
      progress_percent: 100,
      current_step: 'sheet_ready',
      current_message: 'Your Dream Life Map is ready.',
      completed_at: new Date().toISOString()
    })
    .eq('id', job.session_id);

  await logDreamEvent({
    supabase,
    sessionId: job.session_id,
    userId: job.user_id,
    jobId: job.id,
    eventType: 'sheet_ready',
    status: 'sheet_ready',
    progressPercent: 100,
    message: 'Your Dream Life Map is ready.'
  });

  return { sheet_svg_storage_path: svgPath, sheet_json_storage_path: jsonPath };
}

function normalizeCategories(categories: DreamCategory[]): DreamCategory[] {
  return categories.map((category, index) => ({
    ...category,
    sort_order: index,
    feeling_words: category.feeling_words ?? [],
    visual_keywords: category.visual_keywords ?? [],
    aligned_actions: category.aligned_actions ?? []
  }));
}

function buildSheetJson(profile: DreamProfile, categories: any[], assetsByCategory: Map<string, any>) {
  return {
    template_name: 'future_by_design_letter_grid',
    canvas: { width_px: 2550, height_px: 3300, dpi: 300, print_size: 'us_letter' },
    profile,
    categories: categories.map((category) => ({
      category_key: category.category_key,
      display_name: category.display_name,
      desire_statement: category.desire_statement,
      present_tense_declaration: category.present_tense_declaration,
      feeling_words: category.feeling_words,
      image_asset_id: assetsByCategory.get(category.category_key)?.id ?? null,
      image_storage_path: assetsByCategory.get(category.category_key)?.storage_path ?? null
    }))
  };
}

function buildSheetSvg(profile: DreamProfile, categories: any[], images: Record<string, string>): string {
  const visible = categories.filter((c) => c.category_key !== 'unavailable_for').slice(0, 9);
  const cardW = 700;
  const cardH = 610;
  const gapX = 75;
  const gapY = 70;
  const startX = 150;
  const startY = 735;

  const cards = visible.map((category, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const image = images[category.category_key];
    const titleLines = wrapSvgText(category.display_name, 26);
    const bodyLines = wrapSvgText(category.desire_statement ?? '', 42).slice(0, 5);

    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="34" fill="#ffffff" opacity="0.94"/>
        ${image ? `<image href="${image}" x="${x}" y="${y}" width="${cardW}" height="290" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${x}" y="${y}" width="${cardW}" height="290" fill="#dff8f4"/>`}
        <text x="${x + 34}" y="${y + 350}" font-family="Inter, Arial" font-size="34" font-weight="700" fill="#0f353e">
          ${titleLines.map((line, i) => `<tspan x="${x + 34}" dy="${i === 0 ? 0 : 40}">${escapeXml(line)}</tspan>`).join('')}
        </text>
        <text x="${x + 34}" y="${y + 430}" font-family="Inter, Arial" font-size="28" fill="#2d3c41">
          ${bodyLines.map((line, i) => `<tspan x="${x + 34}" dy="${i === 0 ? 0 : 35}">${escapeXml(line)}</tspan>`).join('')}
        </text>
      </g>`;
  }).join('\n');

  const declarationLines = wrapSvgText(profile.center_declaration, 44).slice(0, 3);
  const actionLines = categories.flatMap((c) => c.aligned_actions ?? []).slice(0, 5);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2550" height="3300" viewBox="0 0 2550 3300">
  <rect width="2550" height="3300" fill="#effcfa"/>
  <circle cx="2180" cy="250" r="420" fill="#aeece6" opacity="0.35"/>
  <circle cx="220" cy="3060" r="420" fill="#aeece6" opacity="0.30"/>
  <text x="150" y="160" font-family="Inter, Arial" font-size="82" font-weight="800" fill="#0f353e">${escapeXml(profile.session_title)}</text>
  <text x="150" y="230" font-family="Inter, Arial" font-size="38" fill="#466064">Future by Design</text>
  <rect x="150" y="315" width="2250" height="330" rx="42" fill="#ffffff" opacity="0.90"/>
  <text x="220" y="430" font-family="Inter, Arial" font-size="58" font-weight="700" fill="#0e3f4c">
    ${declarationLines.map((line, i) => `<tspan x="220" dy="${i === 0 ? 0 : 72}">${escapeXml(line)}</tspan>`).join('')}
  </text>
  ${cards}
  <text x="150" y="2865" font-family="Inter, Arial" font-size="42" font-weight="700" fill="#0f353e">My next aligned actions</text>
  <text x="150" y="2935" font-family="Inter, Arial" font-size="30" fill="#2d3c41">
    ${actionLines.map((line, i) => `<tspan x="150" dy="${i === 0 ? 0 : 42}">• ${escapeXml(line)}</tspan>`).join('')}
  </text>
  <text x="150" y="3200" font-family="Inter, Arial" font-size="28" fill="#466064">This visualization is for reflection and planning. It does not guarantee outcomes.</text>
</svg>`;
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(text: string): string {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
