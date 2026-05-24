import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { enqueueDreamJob, logDreamEvent } from '../_shared/jobs.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const supabase = createAdminClient();

    const sessionId = String(body.session_id);
    const inputType = body.input_type as 'audio' | 'text' | 'wispr_transcript';

    const { data: session, error: sessionError } = await supabase
      .from('dream_sessions')
      .select('id,user_id,status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) throw new Error('Session not found');

    const inputPayload = {
      session_id: sessionId,
      user_id: user.id,
      input_type: inputType,
      voice_provider: body.voice_provider ?? (inputType === 'text' ? 'manual_text' : 'unknown'),
      audio_storage_path: body.audio_storage_path ?? null,
      audio_mime_type: body.audio_mime_type ?? null,
      audio_size_bytes: body.audio_size_bytes ?? null,
      raw_text: body.raw_text ?? null,
      transcript_text: inputType === 'wispr_transcript' ? body.transcript_text : null,
      transcript_provider: inputType === 'wispr_transcript' ? 'wispr' : null,
      language: body.language ?? 'en',
      duration_seconds: body.duration_seconds ?? null,
      status: inputType === 'audio' ? 'uploaded' : 'transcript_ready'
    };

    const { data: input, error } = await supabase
      .from('dream_inputs')
      .insert(inputPayload)
      .select('*')
      .single();

    if (error) throw error;

    const jobType = inputType === 'audio' ? 'TRANSCRIBE_INPUT' : 'BUILD_PROFILE';
    const jobId = await enqueueDreamJob({
      supabase,
      sessionId,
      userId: user.id,
      jobType,
      payload: { input_id: input.id },
      priority: 50
    });

    await logDreamEvent({
      supabase,
      sessionId,
      userId: user.id,
      jobId,
      eventType: 'input_submitted',
      status: inputType === 'audio' ? 'audio_uploaded' : 'transcript_ready',
      progressPercent: inputType === 'audio' ? 10 : 20,
      message: inputType === 'audio' ? 'Your voice note has been uploaded.' : 'Your transcript is ready to organize.'
    });

    return jsonResponse({ input, job_id: jobId });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
