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
    const categoryKey = String(body.category_key);
    const userFeedback = String(body.user_feedback ?? '');

    const { data: session, error: sessionError } = await supabase
      .from('dream_sessions')
      .select('id,user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    if (sessionError || !session) throw new Error('Session not found');

    const jobId = await enqueueDreamJob({
      supabase,
      sessionId,
      userId: user.id,
      jobType: 'REGENERATE_CATEGORY_IMAGE',
      payload: { category_key: categoryKey, user_feedback: userFeedback },
      priority: 30
    });

    await logDreamEvent({
      supabase,
      sessionId,
      userId: user.id,
      jobId,
      eventType: 'regenerate_image_queued',
      status: 'generating_images',
      progressPercent: 70,
      message: `Regenerating the ${categoryKey} image.`
    });

    return jsonResponse({ job_id: jobId, status: 'queued' });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
