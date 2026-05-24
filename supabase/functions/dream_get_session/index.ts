import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { createSignedReadUrl } from '../_shared/storage.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const user = await getUserFromRequest(req);
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) throw new Error('Missing session_id');

    const { data: session, error } = await supabase
      .from('dream_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    if (error || !session) throw new Error('Session not found');

    const [{ data: inputs }, { data: profileRows }, { data: categories }, { data: assets }, { data: sheets }, { data: events }] = await Promise.all([
      supabase.from('dream_inputs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('dream_profiles').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1),
      supabase.from('dream_categories').select('*').eq('session_id', sessionId).order('sort_order', { ascending: true }),
      supabase.from('dream_assets').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('dream_sheets').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1),
      supabase.from('dream_job_events').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(25)
    ]);

    const assetsWithUrls = [];
    for (const asset of assets ?? []) {
      let signedUrl: string | null = null;
      if (asset.storage_path) {
        signedUrl = await createSignedReadUrl({ supabase, path: asset.storage_path, expiresInSeconds: 60 * 60 });
      }
      assetsWithUrls.push({ ...asset, signed_url: signedUrl });
    }

    return jsonResponse({
      session,
      inputs: inputs ?? [],
      profile: profileRows?.[0] ?? null,
      categories: categories ?? [],
      assets: assetsWithUrls,
      sheet: sheets?.[0] ?? null,
      events: events ?? []
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message ?? error) }, 400);
  }
});
