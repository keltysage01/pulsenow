export const contactAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "captive_status",
    "candidate_type",
    "persona_segment",
    "priority_tier",
    "life_insurance_partner_score",
    "financial_educator_score",
    "client_prospect_score",
    "referral_partner_score",
    "next_best_action",
    "suggested_message_angle",
    "evidence_summary",
    "confidence",
    "protected_class_used",
    "manual_review_required",
    "missing_data",
    "compliance_flags",
    "source_urls"
  ],
  properties: {
    captive_status: {
      type: "string",
      enum: ["captive_agent", "non_captive_independent", "not_insurance", "unknown"]
    },
    candidate_type: {
      type: "string",
      enum: ["life_insurance_partner", "financial_educator", "referral_partner", "client_prospect", "nurture", "not_a_fit", "manual_review"]
    },
    persona_segment: { type: "string" },
    priority_tier: {
      type: "string",
      enum: ["A", "B", "C", "NURTURE", "MANUAL_REVIEW", "DO_NOT_CONTACT"]
    },
    life_insurance_partner_score: { type: "integer", minimum: 0, maximum: 100 },
    financial_educator_score: { type: "integer", minimum: 0, maximum: 100 },
    client_prospect_score: { type: "integer", minimum: 0, maximum: 100 },
    referral_partner_score: { type: "integer", minimum: 0, maximum: 100 },
    next_best_action: { type: "string" },
    suggested_message_angle: { type: "string" },
    evidence_summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    protected_class_used: { type: "boolean" },
    manual_review_required: { type: "boolean" },
    missing_data: {
      type: "array",
      items: { type: "string" }
    },
    compliance_flags: {
      type: "array",
      items: { type: "string" }
    },
    source_urls: {
      type: "array",
      items: { type: "string" }
    }
  }
} as const;

export type ContactAssessment = {
  captive_status: "captive_agent" | "non_captive_independent" | "not_insurance" | "unknown";
  candidate_type: "life_insurance_partner" | "financial_educator" | "referral_partner" | "client_prospect" | "nurture" | "not_a_fit" | "manual_review";
  persona_segment: string;
  priority_tier: "A" | "B" | "C" | "NURTURE" | "MANUAL_REVIEW" | "DO_NOT_CONTACT";
  life_insurance_partner_score: number;
  financial_educator_score: number;
  client_prospect_score: number;
  referral_partner_score: number;
  next_best_action: string;
  suggested_message_angle: string;
  evidence_summary: string;
  confidence: number;
  protected_class_used: boolean;
  manual_review_required: boolean;
  missing_data: string[];
  compliance_flags: string[];
  source_urls: string[];
};
