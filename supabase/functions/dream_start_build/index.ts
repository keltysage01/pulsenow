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

    const { data: latestInput, error } = await supabase
      .from('dream_inputs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !latestInput) throw new Error('No dream input found');

    const jobType = latestInput.input_type === 'audio' && !latestInput.transcript_text
      ? 'TRANSCRIBE_INPUT'
      : 'BUILD_PROFILE';

    const jobId = await enqueueDreamJob({
      supabase,
      sessionId,
      userId: user.id,
      jobType,
      payload: { input_id: latestInput.id },
      priority: 20
    });

    await logDreamEvent({
      supabase,
      sessionId,
      userId: user.id,
      jobId,
      eventType: 'build_started',
      status: 'queued',
      progressPercent: 15,
      message: 'Your dream build has started.'
    });

    return jsonResponse({ job_id: jobId, status: 'queued' });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
