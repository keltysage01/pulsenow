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
  const professionalText = [
    contact.contact_type,
    contact.job_title,
    contact.occupation,
    contact.notes,
  ].filter(Boolean).join(" ").toLowerCase();
  const isProducerRecord = professionalText.includes("insurance producer") || professionalText.includes("license ") || professionalText.includes("npn ");
  if (!contact.full_name) missing.add("name");
  const hasEmail = Boolean(contact.email);
  const hasPhone = Boolean(contact.phone || contact.phone_e164);
  if (!hasEmail && !hasPhone) missing.add("phone or email");
  else {
    if (!hasEmail) missing.add("email");
    if (!hasPhone) missing.add("phone");
  }
  if (!contact.company && !isProducerRecord) missing.add("company");
  if (!contact.job_title && !contact.occupation) missing.add("role");

  for (const item of assessment?.missing_data || []) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase().replace(/_/g, " ");
    if (!normalized) continue;
    if (normalized === "missing email and phone" && (hasEmail || hasPhone)) continue;
    if (normalized === "missing email" && hasEmail) continue;
    if (normalized === "missing phone" && hasPhone) continue;
    if (normalized === "missing company" && (contact.company || isProducerRecord)) continue;
    if ((normalized === "missing role" || normalized === "missing professional role") && (contact.job_title || contact.occupation)) continue;
    if (normalized === "missing notes") continue;
    missing.add(normalized.replace(/^missing /, ""));
  }

  return Array.from(missing);
}

export function whyThisCategory(assessment?: Record<string, any> | null): string {
  if (!assessment) return "Assessment has not run yet.";
  return assessment.evidence_summary || "Limited evidence is available. Review manually before outreach.";
}
