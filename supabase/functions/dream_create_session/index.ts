import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const supabase = createAdminClient();

    const title = body.title ?? 'My Dream Life Map';
    const toneMode = body.tone_mode ?? Deno.env.get('DREAM_DEFAULT_TONE_MODE') ?? 'faith_centered';
    const visualStyle = body.visual_style ?? Deno.env.get('DREAM_DEFAULT_VISUAL_STYLE') ?? 'future_by_design';

    const { data, error } = await supabase
      .from('dream_sessions')
      .insert({
        user_id: user.id,
        title,
        tone_mode: toneMode,
        visual_style: visualStyle,
        status: 'created',
        progress_percent: 0,
        current_message: 'Your dream session is ready.'
      })
      .select('*')
      .single();

    if (error) throw error;

    return jsonResponse({ session: data });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
