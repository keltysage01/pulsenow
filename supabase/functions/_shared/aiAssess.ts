import { contactAssessmentJsonSchema, ContactAssessment } from "./aiSchemas.ts";
import { inferCaptiveStatusSeed, priorityFromScores, seedScores } from "./scoring.ts";

export type AssessmentInput = {
  contact: Record<string, unknown>;
  evidenceSources?: Array<{
    title?: string | null;
    snippet?: string | null;
    url?: string | null;
    source_type?: string | null;
  }>;
  defaultGoal?: string;
};

function safeContactForPrompt(contact: Record<string, unknown>) {
  return {
    full_name: contact.full_name,
    email_present: Boolean(contact.email),
    phone_present: Boolean(contact.phone || contact.phone_e164),
    city: contact.city,
    state: contact.state,
    company: contact.company,
    job_title: contact.job_title,
    occupation: contact.occupation,
    contact_type: contact.contact_type,
    follow_up_date: contact.follow_up_date,
    notes: contact.notes,
    linkedin_url_present: Boolean(contact.linkedin_url),
    website_url_present: Boolean(contact.website_url),
    do_not_contact: contact.do_not_contact,
    email_opt_out: contact.email_opt_out,
    sms_opt_out: contact.sms_opt_out,

    // These may be displayed, but the prompt explicitly prohibits using them for scoring.
    gender_label_display_only: contact.gender_label,
    married_status_display_only: contact.married_status,
    homeowner_status_display_only: contact.homeowner_status,
  };
}

export function deterministicAssessment(input: AssessmentInput): ContactAssessment {
  const scores = seedScores(input.contact as any);
  const captive = inferCaptiveStatusSeed(input.contact as any);
  const priority = priorityFromScores(scores);
  const maxScore = Math.max(
    scores.life_insurance_partner_score,
    scores.financial_educator_score,
    scores.client_prospect_score,
    scores.referral_partner_score,
  );

  let candidate: ContactAssessment["candidate_type"] = "nurture";
  if (priority === "DO_NOT_CONTACT") candidate = "not_a_fit";
  else if (priority === "MANUAL_REVIEW") candidate = "manual_review";
  else if (scores.life_insurance_partner_score === maxScore && maxScore >= 45) candidate = "life_insurance_partner";
  else if (scores.financial_educator_score === maxScore && maxScore >= 45) candidate = "financial_educator";
  else if (scores.referral_partner_score === maxScore && maxScore >= 45) candidate = "referral_partner";
  else if (scores.client_prospect_score === maxScore && maxScore >= 35) candidate = "client_prospect";

  return {
    captive_status: captive,
    candidate_type: candidate,
    persona_segment: candidate.replaceAll("_", " "),
    priority_tier: priority,
    life_insurance_partner_score: scores.life_insurance_partner_score,
    financial_educator_score: scores.financial_educator_score,
    client_prospect_score: scores.client_prospect_score,
    referral_partner_score: scores.referral_partner_score,
    next_best_action: priority === "DO_NOT_CONTACT" ? "Do not contact. Keep suppressed." : "Review the profile, verify fit, then choose a personal follow up.",
    suggested_message_angle: "Lead with relationship and curiosity. Do not make income, product, or outcome promises.",
    evidence_summary: scores.positive_signals.length ? `Signals: ${scores.positive_signals.join(", ")}.` : "Limited evidence available from CSV.",
    confidence: scores.positive_signals.length >= 3 ? 0.72 : 0.45,
    protected_class_used: false,
    manual_review_required: scores.manual_review_required,
    missing_data: scores.missing_data,
    compliance_flags: scores.compliance_flags,
    source_urls: [],
  };
}

export async function buildContactAssessment(input: AssessmentInput): Promise<ContactAssessment> {
  const aiEnabled = Deno.env.get("AI_ENABLED") !== "false";
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_SMALL_MODEL") || Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4.1-mini";
  const timeoutMs = Number(Deno.env.get("OPENAI_ASSESSMENT_TIMEOUT_MS") || "12000");

  const deterministic = deterministicAssessment(input);

  if (!aiEnabled || !apiKey) {
    return deterministic;
  }

  const system = `
You are Contact Intelligence, an audit friendly AI assistant for organizing a user's contact CSV.

Your job:
- Classify professional fit for life insurance partner, financial educator, referral partner, or client prospect.
- Identify likely captive vs non captive insurance status only from professional evidence.
- Summarize evidence and recommend the next manual follow up.

Hard rules:
- Do not infer gender from name or anything else.
- Do not use gender, sex, age, race, ethnicity, religion, disability, pregnancy, health, or similar protected traits in scoring.
- Marital and homeowner status are display only and must not be used for partner or educator scoring.
- Do not make final hiring, contracting, financial, legal, medical, or suitability decisions.
- Do not promise income, product results, wealth, or guaranteed outcomes.
- Do not say you scraped LinkedIn. If LinkedIn appears, only use uploaded URLs or public search snippets.
- Use source URLs only from the evidence provided.
- If there is not enough evidence, mark manual_review_required true.
- Output only JSON matching the schema.
`;

  const promptPayload = {
    default_goal: input.defaultGoal || "life_insurance_partner",
    contact: safeContactForPrompt(input.contact),
    deterministic_seed: deterministic,
    evidence_sources: input.evidenceSources || [],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(promptPayload) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "contact_assessment",
            strict: true,
            schema: contactAssessmentJsonSchema,
          },
        },
        max_output_tokens: 700,
      }),
    });
  } catch (error) {
    console.error("OpenAI assessment request failed", error);
    return deterministic;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI assessment failed", errorText);
    return deterministic;
  }

  const json = await response.json();
  const outputText = json.output_text || json.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === "output_text")?.text;

  if (!outputText) return deterministic;

  try {
    const parsed = JSON.parse(outputText) as ContactAssessment;
    if (parsed.protected_class_used) {
      parsed.manual_review_required = true;
      parsed.compliance_flags = Array.from(new Set([...(parsed.compliance_flags || []), "protected_class_used_ai_claimed"]));
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse AI output", error);
    return deterministic;
  }
}
