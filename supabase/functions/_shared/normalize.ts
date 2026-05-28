import { ColumnMapping } from "./csv.ts";

export type NormalizedContact = {
  raw_full_name?: string | null;
  raw_first_name?: string | null;
  raw_last_name?: string | null;
  raw_phone?: string | null;
  raw_email?: string | null;
  raw_company?: string | null;
  raw_job_title?: string | null;
  raw_notes?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  company?: string | null;
  job_title?: string | null;
  occupation?: string | null;
  contact_type?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  gender_label: "man" | "woman" | "nonbinary" | "other" | "unknown" | "not_provided";
  original_gender_label?: string | null;
  gender_source: "csv" | "manual" | "self_stated_note" | "not_provided";
  married_status: "yes" | "no" | "unknown" | "not_provided";
  homeowner_status: "yes" | "no" | "unknown" | "not_provided";
  linkedin_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  email_opt_out: boolean;
  sms_opt_out: boolean;
  do_not_contact: boolean;
  dedupe_key?: string | null;
  normalization_errors: string[];
};

function value(row: Record<string, string>, mapping: ColumnMapping, field: string): string | null {
  const header = mapping[field];
  if (!header) return null;
  const raw = row[header];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function cleanText(v: string | null): string | null {
  if (!v) return null;
  const cleaned = v.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function rowText(row: Record<string, string>): string {
  return Object.values(row).filter(Boolean).join(" ");
}

function extractEmail(v: string): string | null {
  const match = v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;
  return match[0].replace(/[).,;:]+$/g, "").toLowerCase();
}

function extractPhone(v: string): string | null {
  const candidates = v.match(/(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?\d{3}[\s.-]?\d{4}/g) || [];
  return candidates[0] || null;
}

function titleCaseName(v: string | null): string | null {
  if (!v) return null;
  return v
    .toLowerCase()
    .split(" ")
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" ");
}

function splitName(fullName: string | null): { first_name: string | null; last_name: string | null } {
  if (!fullName) return { first_name: null, last_name: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: titleCaseName(parts[0]), last_name: null };
  return {
    first_name: titleCaseName(parts[0]),
    last_name: titleCaseName(parts.slice(1).join(" ")),
  };
}

function normalizeEmail(v: string | null): string | null {
  if (!v) return null;
  const email = v.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

function normalizePhone(v: string | null): { phone: string | null; phone_e164: string | null } {
  if (!v) return { phone: null, phone_e164: null };
  const digits = v.replace(/\D/g, "");
  if (!digits) return { phone: null, phone_e164: null };
  let normalized = digits;
  if (digits.length === 11 && digits.startsWith("1")) normalized = digits.slice(1);
  const display = normalized.length === 10
    ? `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`
    : v.trim();
  const e164 = normalized.length === 10 ? `+1${normalized}` : null;
  return { phone: display, phone_e164: e164 };
}

function normalizeBooleanLabel(v: string | null): "yes" | "no" | "unknown" | "not_provided" {
  if (!v) return "not_provided";
  const x = v.trim().toLowerCase();
  if (["yes", "y", "true", "1", "married", "owner", "homeowner", "owns", "own"].includes(x)) return "yes";
  if (["no", "n", "false", "0", "single", "renter", "rent"].includes(x)) return "no";
  return "unknown";
}

function normalizeGender(v: string | null): {
  gender_label: NormalizedContact["gender_label"];
  original_gender_label: string | null;
  gender_source: NormalizedContact["gender_source"];
} {
  if (!v) {
    return { gender_label: "not_provided", original_gender_label: null, gender_source: "not_provided" };
  }

  const original = v.trim();
  const x = original.toLowerCase();

  if (["man", "male", "m", "guy", "boy"].includes(x)) {
    return { gender_label: "man", original_gender_label: original, gender_source: "csv" };
  }
  if (["woman", "female", "f", "lady", "girl"].includes(x)) {
    return { gender_label: "woman", original_gender_label: original, gender_source: "csv" };
  }
  if (["nonbinary", "non-binary", "nb"].includes(x)) {
    return { gender_label: "nonbinary", original_gender_label: original, gender_source: "csv" };
  }
  if (["unknown", "not sure", "n/a", "na"].includes(x)) {
    return { gender_label: "unknown", original_gender_label: original, gender_source: "csv" };
  }

  return { gender_label: "other", original_gender_label: original, gender_source: "csv" };
}

function normalizeUrl(v: string | null): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function normalizeDate(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    const check = new Date(iso);
    return Number.isNaN(check.getTime()) ? null : iso;
  }
  return null;
}

function normalizeBool(v: string | null): boolean {
  if (!v) return false;
  return ["yes", "y", "true", "1", "opt out", "opted out", "do not contact", "dnc"].includes(v.trim().toLowerCase());
}

export function normalizeContact(row: Record<string, string>, mapping: ColumnMapping): NormalizedContact {
  const errors: string[] = [];
  const fallbackText = rowText(row);
  const rawFirst = cleanText(value(row, mapping, "first_name"));
  const rawLast = cleanText(value(row, mapping, "last_name"));
  const rawFull = cleanText(value(row, mapping, "full_name"));
  const rawPhone = cleanText(value(row, mapping, "phone")) || cleanText(extractPhone(fallbackText));
  const rawEmail = cleanText(value(row, mapping, "email")) || cleanText(extractEmail(fallbackText));
  const rawCompany = cleanText(value(row, mapping, "company"));
  const rawJobTitle = cleanText(value(row, mapping, "job_title"));
  const rawNotes = cleanText(value(row, mapping, "notes"));

  const split = splitName(rawFull);
  const firstName = titleCaseName(rawFirst) || split.first_name;
  const lastName = titleCaseName(rawLast) || split.last_name;
  const fullName = titleCaseName(rawFull) || cleanText([firstName, lastName].filter(Boolean).join(" "));

  const email = normalizeEmail(rawEmail);
  if (rawEmail && !email) errors.push("Invalid email format");

  const phoneData = normalizePhone(rawPhone);
  if (rawPhone && !phoneData.phone_e164) errors.push("Phone could not be normalized to E.164");

  const gender = normalizeGender(value(row, mapping, "gender_label"));
  const married = normalizeBooleanLabel(value(row, mapping, "married"));
  const homeowner = normalizeBooleanLabel(value(row, mapping, "homeowner"));
  const doNotContact = normalizeBool(value(row, mapping, "do_not_contact"));
  const emailOptOut = normalizeBool(value(row, mapping, "email_opt_out"));
  const smsOptOut = normalizeBool(value(row, mapping, "sms_opt_out"));

  const city = cleanText(value(row, mapping, "city"));
  const state = cleanText(value(row, mapping, "state"))?.toUpperCase() ?? null;
  const zip = cleanText(value(row, mapping, "zip"));
  const company = cleanText(rawCompany);
  const jobTitle = cleanText(rawJobTitle);
  const contactType = cleanText(value(row, mapping, "contact_type"));
  const followUpDate = normalizeDate(value(row, mapping, "follow_up_date"));

  const linkedinUrl = normalizeUrl(value(row, mapping, "linkedin_url"));
  const facebookUrl = normalizeUrl(value(row, mapping, "facebook_url"));
  const instagramUrl = normalizeUrl(value(row, mapping, "instagram_url"));
  const websiteUrl = normalizeUrl(value(row, mapping, "website_url"));

  const dedupeParts = [email, phoneData.phone_e164, fullName?.toLowerCase(), city?.toLowerCase(), state?.toLowerCase()].filter(Boolean);
  const dedupeKey = dedupeParts.join("|") || null;

  if (!fullName && !email && !phoneData.phone) errors.push("Missing name, email, and phone");

  return {
    raw_full_name: rawFull,
    raw_first_name: rawFirst,
    raw_last_name: rawLast,
    raw_phone: rawPhone,
    raw_email: rawEmail,
    raw_company: rawCompany,
    raw_job_title: rawJobTitle,
    raw_notes: rawNotes,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email,
    phone: phoneData.phone,
    phone_e164: phoneData.phone_e164,
    city,
    state,
    zip,
    company,
    job_title: jobTitle,
    occupation: jobTitle,
    contact_type: contactType,
    follow_up_date: followUpDate,
    notes: rawNotes,
    gender_label: gender.gender_label,
    original_gender_label: gender.original_gender_label,
    gender_source: gender.gender_source,
    married_status: married,
    homeowner_status: homeowner,
    linkedin_url: linkedinUrl,
    facebook_url: facebookUrl,
    instagram_url: instagramUrl,
    website_url: websiteUrl,
    email_opt_out: emailOptOut,
    sms_opt_out: smsOptOut,
    do_not_contact: doNotContact,
    dedupe_key: dedupeKey,
    normalization_errors: errors,
  };
}
