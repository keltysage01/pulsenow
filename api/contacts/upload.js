import { getSessionFromRequest, getSupabaseAdmin, readBody, sendJson } from '../_lib/pulse-utils.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const action = String(req.query.action || '');

  if (req.method === 'GET' && action === 'contact-intelligence-config') {
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    return sendJson(res, 200, {
      supabaseUrl,
      anonKey,
      configured: Boolean(supabaseUrl && anonKey),
    });
  }

  if (req.method === 'POST' && action === 'run-contact-worker') {
    return runContactWorker(req, res);
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const raw = await readBody(req);
    const session = getSessionFromRequest(req, {});
    const csvText = extractCsv(req, raw);
    if (!csvText.trim()) return sendJson(res, 400, { error: 'empty_csv' });

    const rows = parseCsv(csvText);
    const contacts = rows
      .map(mapCsvContact)
      .filter((contact) => contact.first_name || contact.last_name || contact.name);

    const supabase = getSupabaseAdmin();
    let inserted = contacts.length;
    const errors = [];

    if (supabase && session.id && session.id !== 'demo-user' && contacts.length > 0) {
      const rowsToInsert = contacts.map((contact) => ({
        org_id: session.org_id,
        owner_user_id: session.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        city: contact.city,
        state: contact.state,
        contact_type: contact.contact_type,
        imported_from: 'csv',
        notes: contact.notes,
      }));
      const { error } = await supabase.from('contacts').insert(rowsToInsert);
      if (error) {
        inserted = 0;
        errors.push({ reason: error.message });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      inserted,
      parsed: contacts.length,
      errors_count: errors.length,
      errors,
      preview: contacts.slice(0, 10),
      mode: supabase ? 'supabase' : 'local-preview',
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'csv_upload_failed' });
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

async function runContactWorker(req, res) {
  const supabaseUrl = getSupabaseUrl();
  const workerSecret = process.env.CONTACT_WORKER_SECRET || '';
  if (!supabaseUrl || !workerSecret) {
    return sendJson(res, 503, {
      error: 'contact_worker_not_configured',
      message: 'Contact Intelligence worker is not configured for this deployment.',
    });
  }

  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
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

function extractCsv(req, raw) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return raw;
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return raw;
  const parts = raw.split(`--${boundary}`);
  const filePart = parts.find((part) => part.includes('name="file"')) || '';
  const bodyStart = filePart.indexOf('\r\n\r\n');
  if (bodyStart === -1) return '';
  return filePart.slice(bodyStart + 4).replace(/\r\n--$/, '').trim();
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().trim().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function mapCsvContact(row) {
  const first = row.first_name || row.firstname || row.fname || '';
  const last = row.last_name || row.lastname || row.lname || '';
  const name = row.name || [first, last].filter(Boolean).join(' ');
  return {
    name,
    first_name: first || name.split(' ')[0] || '',
    last_name: last || name.split(' ').slice(1).join(' '),
    phone: row.phone || row.mobile || '',
    email: row.email || '',
    city: row.city || '',
    state: row.state || '',
    contact_type: row.contact_type || row.type || 'prospect',
    notes: row.notes || row.carrier || row.company || '',
  };
}
