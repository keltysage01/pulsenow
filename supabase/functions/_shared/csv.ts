export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
};

export type ColumnMapping = Record<string, string | null>;

const FIELD_ALIASES: Record<string, string[]> = {
  first_name: ["first", "first_name", "fname", "given_name", "given"],
  last_name: ["last", "last_name", "lname", "surname", "family_name", "family"],
  full_name: ["name", "full_name", "contact_name", "customer_name", "prospect_name", "person"],
  phone: ["phone", "mobile", "cell", "number", "phone_number", "primary_phone", "telephone", "tel"],
  email: ["email", "email_address", "e_mail", "primary_email"],
  contact_type: ["type", "contact_type", "lead_type", "category", "relationship", "source_type"],
  follow_up_date: ["followup", "follow_up", "follow_up_date", "next_followup", "next_follow_up", "follow_up_on", "callback_date"],
  married: ["married", "spouse", "relationship_status", "marital_status"],
  homeowner: ["homeowner", "owns_home", "home_owner", "mortgage", "owns_property", "property_owner"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  zip: ["zip", "zipcode", "postal_code", "postal"],
  company: ["company", "employer", "organization", "agency", "business"],
  job_title: ["title", "job_title", "occupation", "role", "position", "profession"],
  linkedin_url: ["linkedin", "linkedin_url", "linked_in", "linkedin_profile"],
  facebook_url: ["facebook", "facebook_url", "fb"],
  instagram_url: ["instagram", "instagram_url", "ig"],
  website_url: ["website", "web", "site", "url", "business_url"],
  gender_label: ["gender", "sex", "man_woman", "male_female"],
  notes: ["notes", "note", "comments", "description", "details"],
  email_opt_out: ["email_opt_out", "unsubscribe", "unsubscribed", "do_not_email"],
  sms_opt_out: ["sms_opt_out", "text_opt_out", "do_not_text"],
  do_not_contact: ["do_not_contact", "dnc", "opt_out", "blocked"],
};

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s\-\/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function detectColumnMapping(headers: string[]): { mapping: ColumnMapping; unmappedHeaders: string[] } {
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }));
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const found = normalizedHeaders.find((h) => aliases.includes(h.normalized) && !usedHeaders.has(h.original));
    if (found) {
      mapping[field] = found.original;
      usedHeaders.add(found.original);
    } else {
      mapping[field] = null;
    }
  }

  // Conservative fuzzy fallbacks.
  for (const h of normalizedHeaders) {
    if (usedHeaders.has(h.original)) continue;
    if (!mapping.full_name && h.normalized.includes("name")) {
      mapping.full_name = h.original;
      usedHeaders.add(h.original);
      continue;
    }
    if (!mapping.phone && (h.normalized.includes("phone") || h.normalized.includes("mobile"))) {
      mapping.phone = h.original;
      usedHeaders.add(h.original);
      continue;
    }
    if (!mapping.email && h.normalized.includes("email")) {
      mapping.email = h.original;
      usedHeaders.add(h.original);
      continue;
    }
  }

  const unmappedHeaders = headers.filter((h) => !usedHeaders.has(h));
  return { mapping, unmappedHeaders };
}

export function parseCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(current);
      current = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }

  if (inQuotes) {
    errors.push("CSV ended while inside quoted field");
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], errors: ["CSV is empty"] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((values, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      record[header] = (values[colIndex] ?? "").trim();
    });
    if (values.length > headers.length) {
      errors.push(`Row ${index + 2} has more columns than header row`);
    }
    return record;
  });

  return { headers, rows: dataRows, errors };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}
