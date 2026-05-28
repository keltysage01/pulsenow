function sendJson(res, status, payload) {
  res.status(status).setHeader('content-type', 'application/json');
  return res.end(JSON.stringify(payload));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

export default async function handler(req, res) {
  const action = String(req.query.action || '');
  const supabaseUrl = getSupabaseUrl();

  if (req.method === 'GET' && action === 'config') {
    const anonKey = getSupabaseAnonKey();
    return sendJson(res, 200, {
      supabaseUrl,
      anonKey,
      configured: Boolean(supabaseUrl && anonKey),
    });
  }

  if (req.method === 'POST' && action === 'run-worker') {
    const workerSecret = process.env.CONTACT_WORKER_SECRET || '';
    if (!supabaseUrl || !workerSecret) {
      return sendJson(res, 503, {
        error: 'contact_worker_not_configured',
        message: 'Contact Intelligence worker is not configured for this deployment.',
      });
    }

    const body = await readJson(req);
    const importId = body.import_id || body.importId || null;
    const limit = Number(body.limit || 500);

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/contacts_worker`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-contact-worker-secret': workerSecret,
      },
      body: JSON.stringify({
        import_id: importId,
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 500,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data.error || 'contact_worker_failed',
        message: data.message || 'Contact worker failed.',
        details: data,
      });
    }
    return sendJson(res, 200, data);
  }

  return sendJson(res, 404, { error: 'unknown_contact_intelligence_action' });
}
