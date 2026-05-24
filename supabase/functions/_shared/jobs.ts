import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DreamJobType } from './types.ts';

export async function enqueueDreamJob(params: {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
  jobType: DreamJobType;
  payload?: Record<string, unknown>;
  priority?: number;
}) {
  const { data, error } = await params.supabase.rpc('enqueue_dream_job', {
    p_session_id: params.sessionId,
    p_user_id: params.userId,
    p_job_type: params.jobType,
    p_payload: params.payload ?? {},
    p_priority: params.priority ?? 100
  });

  if (error) throw error;
  return data as string;
}

export async function logDreamEvent(params: {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
  jobId?: string | null;
  eventType: string;
  status?: string | null;
  progressPercent?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.rpc('log_dream_event', {
    p_session_id: params.sessionId,
    p_user_id: params.userId,
    p_job_id: params.jobId ?? null,
    p_event_type: params.eventType,
    p_status: params.status ?? null,
    p_progress_percent: params.progressPercent ?? null,
    p_message: params.message ?? null,
    p_metadata: params.metadata ?? {}
  });

  if (error) throw error;
}

export async function markJobSuccess(params: {
  supabase: SupabaseClient;
  jobId: string;
  result?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.rpc('release_dream_job_success', {
    p_job_id: params.jobId,
    p_result: params.result ?? {}
  });
  if (error) throw error;
}

export async function markJobFailure(params: {
  supabase: SupabaseClient;
  jobId: string;
  errorCode: string;
  errorMessage: string;
  retry?: boolean;
}) {
  const { error } = await params.supabase.rpc('release_dream_job_failure', {
    p_job_id: params.jobId,
    p_error_code: params.errorCode,
    p_error_message: params.errorMessage,
    p_retry: params.retry ?? true
  });
  if (error) throw error;
}
