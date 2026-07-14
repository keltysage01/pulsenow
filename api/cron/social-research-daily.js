import { getSupabaseAdmin, sendJson, todayKey } from '../_lib/pulse-utils.js';

function getContactWorkerUrl() {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/functions/v1/contacts_worker`;
}

async function invokeContactWorkerOnce(functionUrl, workerSecret) {
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-contact-worker-secret': workerSecret,
    },
    body: JSON.stringify({ source: 'vercel-social-research-cron' }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

// Drain the Contact Intelligence queue instead of processing a single
// 5-contact batch. Each worker call claims one job; keep claiming a few in
// parallel until nothing is left to claim or the cron time budget is spent.
async function invokeContactWorker() {
  const workerSecret = process.env.CONTACT_WORKER_SECRET;
  const functionUrl = getContactWorkerUrl();

  if (!functionUrl || !workerSecret) {
    return {
      ok: false,
      mode: 'not-configured',
      message: 'Add SUPABASE_URL and CONTACT_WORKER_SECRET to process Contact Intelligence jobs.',
    };
  }

  const TIME_BUDGET_MS = 240000;
  const CONCURRENCY = 4;
  const started = Date.now();
  let jobsCompleted = 0;
  let jobsFailed = 0;
  let drained = false;

  while (Date.now() - started < TIME_BUDGET_MS) {
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => invokeContactWorkerOnce(functionUrl, workerSecret))
    );
    let claimed = 0;
    for (const r of results) {
      if (r.payload && r.payload.claimed) {
        claimed++;
        if (r.payload.status === 'complete') jobsCompleted++;
        else jobsFailed++;
      } else if (!r.ok) {
        jobsFailed++;
      }
    }
    if (claimed === 0) {
      drained = true;
      break;
    }
  }

  return {
    ok: true,
    drained,
    jobs_completed: jobsCompleted,
    jobs_failed: jobsFailed,
    elapsed_ms: Date.now() - started,
  };
}

export default async function handler(req, res) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization
    ? String(req.headers.authorization).replace(/^Bearer\s+/i, '')
    : String(req.query?.secret || '');

  if (configuredSecret && providedSecret !== configuredSecret) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const liveSearchEnabled = Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.SERPAPI_API_KEY);
  const contactWorker = await invokeContactWorker();

  if (!supabase) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'local-preview',
      date: todayKey(),
      live_search_enabled: liveSearchEnabled,
      contact_intelligence_worker: contactWorker,
      message:
        'Background social research cron is live. Add Supabase plus BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY to persist researched contacts.',
    });
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('id, org_id, owner_user_id, first_name, last_name, phone, email, city, state, notes')
    .eq('is_archived', false)
    .limit(100);

  if (error) return sendJson(res, 500, { error: error.message });

  return sendJson(res, 200, {
    ok: true,
    date: todayKey(),
    live_search_enabled: liveSearchEnabled,
    contact_intelligence_worker: contactWorker,
    queued: data ? data.length : 0,
    message:
      'Contacts selected for background research. Persistence of social fields should be mapped once the production schema adds social profile columns.',
  });
}
