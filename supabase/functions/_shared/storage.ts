import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const DREAM_BUCKET = Deno.env.get('DREAM_ASSETS_BUCKET') ?? 'dream_life_assets';

export function makeStoragePath(params: {
  userId: string;
  sessionId: string;
  folder: string;
  filename: string;
}): string {
  return `${params.userId}/${params.sessionId}/${params.folder}/${params.filename}`;
}

export async function uploadBytes(params: {
  supabase: SupabaseClient;
  path: string;
  bytes: Uint8Array;
  contentType: string;
  upsert?: boolean;
}) {
  const { data, error } = await params.supabase.storage
    .from(DREAM_BUCKET)
    .upload(params.path, params.bytes, {
      contentType: params.contentType,
      upsert: params.upsert ?? true
    });

  if (error) throw error;
  return data;
}

export async function downloadBlob(params: {
  supabase: SupabaseClient;
  path: string;
}): Promise<Blob> {
  const { data, error } = await params.supabase.storage.from(DREAM_BUCKET).download(params.path);
  if (error) throw error;
  if (!data) throw new Error('Storage download returned no blob');
  return data;
}

export async function createSignedReadUrl(params: {
  supabase: SupabaseClient;
  path: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { data, error } = await params.supabase.storage
    .from(DREAM_BUCKET)
    .createSignedUrl(params.path, params.expiresInSeconds ?? 60 * 60 * 24 * 7);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signedUrl returned');
  return data.signedUrl;
}
