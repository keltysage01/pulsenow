export const contactCategoryDefinitions = {
  life_insurance_partner: "May be a fit for an insurance partnership or recruiting conversation based on allowed professional evidence.",
  financial_educator: "May be a fit for financial education, workshops, or community education based on role, notes, or public professional context.",
  referral_partner: "May know people who need support but is not necessarily a direct client or partner.",
  client_prospect: "May be a fit for a client conversation based on allowed CSV fields and notes.",
  nurture: "Keep in long-term follow-up because timing, fit, or evidence is not strong enough yet.",
  manual_review: "Not enough reliable information, or there are compliance or sensitivity concerns.",
  not_a_fit: "Current evidence does not support a useful prospect conversation.",
  do_not_contact: "Opt-out, do-not-contact, bad data, or other compliance reason.",
  captive_agent: "Appears tied to a captive insurance company. Use only professional evidence, not protected traits.",
  non_captive_independent: "Appears to work independently or with non-captive insurance or financial services. Use only professional evidence.",
  not_insurance: "Professional evidence does not indicate an insurance role.",
  unknown: "The system does not have enough evidence to classify.",
} as const;

export function displayNameForContact(contact: Record<string, any>): string {
  return contact.full_name || contact.email || contact.phone || contact.phone_e164 || `Row ${contact.row_number ?? "unknown"}`;
}

export function prospectStatusFor(contact: Record<string, any>, assessment?: Record<string, any> | null): string {
  if (contact.do_not_contact || assessment?.priority_tier === "DO_NOT_CONTACT") return "Do not contact";
  if (!contact.full_name && !contact.email && !contact.phone && !contact.phone_e164) return "Not enough data";
  if (assessment?.manual_review_required || assessment?.candidate_type === "manual_review" || contact.parse_status === "needs_review") return "Needs review";
  if (assessment?.candidate_type === "nurture" || assessment?.priority_tier === "NURTURE") return "Nurture";
  return "Potential prospect";
}

export function missingInfoFor(contact: Record<string, any>, assessment?: Record<string, any> | null): string[] {
  const missing = new Set<string>();
  if (!contact.full_name) missing.add("name");
  if (!contact.email) missing.add("email");
  if (!contact.phone && !contact.phone_e164) missing.add("phone");
  if (!contact.company) missing.add("company");
  if (!contact.job_title && !contact.occupation) missing.add("role");
  if (!contact.notes) missing.add("notes");
  for (const item of assessment?.missing_data || []) {
    if (typeof item === "string" && item.trim()) missing.add(item.trim());
  }
  return Array.from(missing);
}

export function whyThisCategory(assessment?: Record<string, any> | null): string {
  if (!assessment) return "Assessment has not run yet.";
  return assessment.evidence_summary || "Limited evidence is available. Review manually before outreach.";
}
