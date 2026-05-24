import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { DREAM_BUCKET, makeStoragePath } from '../_shared/storage.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const supabase = createAdminClient();

    const sessionId = String(body.session_id);
    const fileExt = String(body.file_ext ?? 'webm').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const contentType = String(body.content_type ?? 'audio/webm');

    const { data: session, error: sessionError } = await supabase
      .from('dream_sessions')
      .select('id,user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) throw new Error('Session not found');

    const path = makeStoragePath({
      userId: user.id,
      sessionId,
      folder: 'audio',
      filename: `input_${Date.now()}.${fileExt}`
    });

    const { data, error } = await supabase.storage
      .from(DREAM_BUCKET)
      .createSignedUploadUrl(path);

    if (error) throw error;

    return jsonResponse({
      bucket: DREAM_BUCKET,
      path,
      content_type: contentType,
      signed_upload_url: data.signedUrl,
      token: data.token
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
