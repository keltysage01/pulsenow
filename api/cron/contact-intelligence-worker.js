import { sendJson, todayKey } from '../_lib/pulse-utils.js';

function getSupabaseFunctionUrl() {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/functions/v1/contacts_worker`;
}

export default async function handler(req, res) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization
    ? String(req.headers.authorization).replace(/^Bearer\s+/i, '')
    : String(req.query?.secret || '');

  if (configuredSecret && providedSecret !== configuredSecret) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  const workerSecret = process.env.CONTACT_WORKER_SECRET;
  const functionUrl = getSupabaseFunctionUrl();

  if (!functionUrl || !workerSecret) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'not-configured',
      date: todayKey(),
      message: 'Contact Intelligence worker cron is live. Add SUPABASE_URL and CONTACT_WORKER_SECRET to process queued jobs.',
    });
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-contact-worker-secret': workerSecret,
    },
    body: JSON.stringify({ source: 'vercel-cron' }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return sendJson(res, response.ok ? 200 : 502, {
    ok: response.ok,
    date: todayKey(),
    worker_status: response.status,
    worker: payload,
  });
}
