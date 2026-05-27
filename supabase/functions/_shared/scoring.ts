export type SeedScores = {
  life_insurance_partner_score: number;
  financial_educator_score: number;
  client_prospect_score: number;
  referral_partner_score: number;
  manual_review_required: boolean;
  compliance_flags: string[];
  positive_signals: string[];
  missing_data: string[];
};

export type ContactForScoring = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
  company?: string | null;
  job_title?: string | null;
  occupation?: string | null;
  contact_type?: string | null;
  notes?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  married_status?: string | null;
  homeowner_status?: string | null;
  do_not_contact?: boolean;
  email_opt_out?: boolean;
  sms_opt_out?: boolean;
};

const leadershipTerms = [
  "coach", "teacher", "trainer", "pastor", "minister", "leader", "mentor",
  "educator", "consultant", "speaker", "community", "director", "manager",
  "owner", "founder", "entrepreneur", "business owner"
];

const financialTerms = [
  "insurance", "financial", "finance", "mortgage", "realtor", "real estate",
  "broker", "agent", "advisor", "planner", "bank", "tax", "accounting",
  "bookkeeper", "loan", "wealth", "annuity", "life insurance"
];

const captiveSignals = [
  "state farm", "allstate", "farmers", "american family", "country financial",
  "northwestern mutual", "new york life", "primerica", "world financial group",
  "globe life", "liberty mutual"
];

const independentSignals = [
  "independent", "broker", "brokerage", "agency owner", "multiple carriers",
  "imo", "fmo", "bga", "independent agent", "independent broker"
];

function textBlob(contact: ContactForScoring): string {
  return [
    contact.company,
    contact.job_title,
    contact.occupation,
    contact.contact_type,
    contact.notes,
  ].filter(Boolean).join(" ").toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function inferCaptiveStatusSeed(contact: ContactForScoring): "captive_agent" | "non_captive_independent" | "not_insurance" | "unknown" {
  const blob = textBlob(contact);
  if (!blob.trim()) return "unknown";
  if (includesAny(blob, independentSignals)) return "non_captive_independent";
  if (includesAny(blob, captiveSignals)) return "captive_agent";
  if (includesAny(blob, ["insurance", "agent", "broker", "advisor", "financial"])) return "unknown";
  return "not_insurance";
}

export function seedScores(contact: ContactForScoring): SeedScores {
  let partner = 0;
  let educator = 0;
  let client = 0;
  let referral = 0;
  const positive_signals: string[] = [];
  const missing_data: string[] = [];
  const compliance_flags: string[] = [];
  let manual_review_required = false;

  const blob = textBlob(contact);
  const captiveStatus = inferCaptiveStatusSeed(contact);

  if (contact.do_not_contact) {
    return {
      life_insurance_partner_score: 0,
      financial_educator_score: 0,
      client_prospect_score: 0,
      referral_partner_score: 0,
      manual_review_required: true,
      compliance_flags: ["do_not_contact"],
      positive_signals: [],
      missing_data: [],
    };
  }

  if (contact.email || contact.phone || contact.phone_e164) {
    partner += 10; educator += 10; client += 10; referral += 10;
    positive_signals.push("has_contact_method");
  } else {
    missing_data.push("missing_email_and_phone");
    manual_review_required = true;
  }

  if (contact.company) {
    partner += 8; educator += 6; referral += 7;
    positive_signals.push("has_company");
  }
  if (contact.job_title || contact.occupation) {
    partner += 8; educator += 10; referral += 8;
    positive_signals.push("has_professional_role");
  }
  if (contact.linkedin_url || contact.website_url) {
    partner += 8; educator += 8; referral += 8;
    positive_signals.push("has_professional_link");
  }

  if (includesAny(blob, leadershipTerms)) {
    partner += 13; educator += 22; referral += 15;
    positive_signals.push("leadership_or_education_signal");
  }

  if (includesAny(blob, financialTerms)) {
    partner += 18; educator += 18; referral += 12;
    positive_signals.push("financial_services_signal");
  }

  if (captiveStatus === "non_captive_independent") {
    partner += 25; educator += 14; referral += 20;
    positive_signals.push("non_captive_or_independent_signal");
  }

  if (captiveStatus === "captive_agent") {
    partner += 8; educator += 8; referral += 8;
    manual_review_required = true;
    compliance_flags.push("possible_captive_agent_review_employment_restrictions");
  }

  if (contact.notes && /help|families|teach|education|mission|serve|community|business|income|freedom/i.test(contact.notes)) {
    partner += 12; educator += 15; referral += 10;
    positive_signals.push("notes_align_with_mission_or_education");
  }

  if (contact.email_opt_out) compliance_flags.push("email_opt_out");
  if (contact.sms_opt_out) compliance_flags.push("sms_opt_out");

  // Marital and homeowner status are display-only. They must not influence scores.
  if (contact.married_status && !["unknown", "not_provided"].includes(contact.married_status)) {
    compliance_flags.push("marital_status_display_only_not_scored");
  }
  if (contact.homeowner_status && !["unknown", "not_provided"].includes(contact.homeowner_status)) {
    compliance_flags.push("homeowner_status_display_only_not_scored");
  }
  if (contact.contact_type && /client|lead|prospect|family|friend/i.test(contact.contact_type)) client += 10;

  return {
    life_insurance_partner_score: clamp(partner),
    financial_educator_score: clamp(educator),
    client_prospect_score: clamp(client),
    referral_partner_score: clamp(referral),
    manual_review_required,
    compliance_flags,
    positive_signals,
    missing_data,
  };
}

export function priorityFromScores(scores: SeedScores): "A" | "B" | "C" | "NURTURE" | "MANUAL_REVIEW" | "DO_NOT_CONTACT" {
  if (scores.compliance_flags.includes("do_not_contact")) return "DO_NOT_CONTACT";
  if (scores.manual_review_required && Math.max(scores.life_insurance_partner_score, scores.financial_educator_score, scores.referral_partner_score) >= 55) return "MANUAL_REVIEW";
  const max = Math.max(scores.life_insurance_partner_score, scores.financial_educator_score, scores.client_prospect_score, scores.referral_partner_score);
  if (max >= 75) return "A";
  if (max >= 55) return "B";
  if (max >= 35) return "C";
  return "NURTURE";
}
