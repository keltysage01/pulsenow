import { handleOptions } from "../_shared/cors.ts";
import { json, serverError } from "../_shared/respond.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { buildContactAssessment } from "../_shared/aiAssess.ts";
import { researchContact } from "../_shared/researchProviders.ts";

const workerName = Deno.env.get("CONTACT_WORKER_NAME") || `edge-worker-${crypto.randomUUID()}`;

async function logEvent(admin: any, job: any, eventType: string, message: string, metadata: Record<string, unknown> = {}, contactId?: string) {
  await admin.rpc("log_contact_job_event", {
    p_job_id: job.id,
    p_import_id: job.import_id,
    p_contact_id: contactId || null,
    p_user_id: job.user_id,
    p_event_type: eventType,
    p_message: message,
    p_metadata: metadata,
  });
}

async function completeJob(admin: any, job: any, status: "complete" | "failed" | "retry", errorMessage?: string) {
  await admin
    .from("contact_jobs")
    .update({
      status,
      error_message: errorMessage || null,
      completed_at: status === "complete" ? new Date().toISOString() : null,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id);
}

async function upsertAssessment(admin: any, contact: any, assessment: any, modelName: string) {
  const payload = {
    user_id: contact.user_id,
    import_id: contact.import_id,
    contact_id: contact.id,
    captive_status: assessment.captive_status,
    candidate_type: assessment.candidate_type,
    persona_segment: assessment.persona_segment,
    priority_tier: assessment.priority_tier,
    life_insurance_partner_score: assessment.life_insurance_partner_score,
    financial_educator_score: assessment.financial_educator_score,
    client_prospect_score: assessment.client_prospect_score,
    referral_partner_score: assessment.referral_partner_score,
    next_best_action: assessment.next_best_action,
    suggested_message_angle: assessment.suggested_message_angle,
    evidence_summary: assessment.evidence_summary,
    confidence: assessment.confidence,
    protected_class_used: assessment.protected_class_used,
    manual_review_required: assessment.manual_review_required,
    missing_data: assessment.missing_data,
    compliance_flags: assessment.compliance_flags,
    source_urls: assessment.source_urls,
    assessment_json: assessment,
    model_name: modelName,
  };

  const { error } = await admin
    .from("contact_ai_assessments")
    .upsert(payload, { onConflict: "contact_id" });

  if (error) throw error;

  const { error: updateError } = await admin
    .from("contact_records")
    .update({ assessment_status: "complete" })
    .eq("id", contact.id);

  if (updateError) throw updateError;
}

async function assessImportContacts(admin: any, job: any) {
  const limit = Number(job.payload?.limit || Deno.env.get("CONTACT_MAX_ROWS_PER_JOB") || "500");
  const modelName = Deno.env.get("OPENAI_SMALL_MODEL") || Deno.env.get("OPENAI_TEXT_MODEL") || "deterministic";

  await logEvent(admin, job, "assess_started", "Assessing contacts", { limit });
  await admin.from("contact_imports").update({ status: "assessing" }).eq("id", job.import_id);

  const { data: importRow, error: importError } = await admin
    .from("contact_imports")
    .select("*")
    .eq("id", job.import_id)
    .single();
  if (importError) throw importError;

  const { data: contacts, error } = await admin
    .from("contact_records")
    .select("*")
    .eq("import_id", job.import_id)
    .eq("user_id", job.user_id)
    .neq("parse_status", "duplicate")
    .in("assessment_status", ["queued", "not_started", "failed"])
    .limit(limit);

  if (error) throw error;

  let assessed = 0;
  let failed = 0;

  for (const contact of contacts || []) {
    try {
      await admin.from("contact_records").update({ assessment_status: "assessing" }).eq("id", contact.id);

      const { data: evidence } = await admin
        .from("contact_enrichment_sources")
        .select("title,snippet,url,source_type")
        .eq("contact_id", contact.id)
        .limit(10);

      const assessment = await buildContactAssessment({
        contact,
        evidenceSources: evidence || [],
        defaultGoal: importRow.default_goal,
      });

      await upsertAssessment(admin, contact, assessment, modelName);
      assessed++;

      if (assessed % 10 === 0) {
        await logEvent(admin, job, "assess_progress", `Assessed ${assessed} contacts`, { assessed, failed });
      }
    } catch (contactError) {
      failed++;
      await admin.from("contact_records").update({ assessment_status: "failed" }).eq("id", contact.id);
      await logEvent(admin, job, "assess_contact_failed", contactError instanceof Error ? contactError.message : String(contactError), {}, contact.id);
    }
  }

  const { count: assessmentCount } = await admin
    .from("contact_ai_assessments")
    .select("id", { count: "exact", head: true })
    .eq("import_id", job.import_id);

  await admin
    .from("contact_imports")
    .update({
      status: "ready",
      assessment_count: assessmentCount || assessed,
    })
    .eq("id", job.import_id);

  await logEvent(admin, job, "assess_complete", "Assessment complete", { assessed, failed });
}

function platformFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "linkedin";
  if (lower.includes("facebook.com")) return "facebook";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("youtube.com")) return "youtube";
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "x";
  if (/^https?:\/\//.test(lower)) return "website";
  return null;
}

async function researchContacts(admin: any, job: any) {
  const max = Number(job.payload?.limit || Deno.env.get("CONTACT_MAX_RESEARCH_PER_JOB") || "25");
  const contactIds: string[] | undefined = job.payload?.contact_ids;
  const modelName = Deno.env.get("OPENAI_SMALL_MODEL") || Deno.env.get("OPENAI_TEXT_MODEL") || "deterministic";

  await logEvent(admin, job, "research_started", "Research started", { max, selected_count: contactIds?.length || null });
  await admin.from("contact_imports").update({ status: "researching" }).eq("id", job.import_id);

  let query = admin
    .from("contact_records")
    .select("*")
    .eq("import_id", job.import_id)
    .eq("user_id", job.user_id)
    .neq("parse_status", "duplicate")
    .neq("do_not_contact", true)
    .limit(max);

  if (contactIds?.length) {
    query = query.in("id", contactIds);
  } else {
    query = query.in("research_status", ["not_started", "failed"]);
  }

  const { data: contacts, error } = await query;
  if (error) throw error;

  let researched = 0;
  let failed = 0;

  for (const contact of contacts || []) {
    try {
      await admin.from("contact_records").update({ research_status: "researching" }).eq("id", contact.id);
      const sources = await researchContact({
        contact_id: contact.id,
        full_name: contact.full_name,
        city: contact.city,
        state: contact.state,
        company: contact.company,
        job_title: contact.job_title,
        linkedin_url: contact.linkedin_url,
        website_url: contact.website_url,
      });

      if (sources.length) {
        const sourceRows = sources.map((source) => ({
          user_id: contact.user_id,
          import_id: contact.import_id,
          contact_id: contact.id,
          provider: source.provider,
          source_type: source.source_type,
          query: source.query,
          title: source.title,
          snippet: source.snippet,
          url: source.url,
          confidence: source.confidence,
          raw_result: source.raw_result || {},
        }));

        const { error: sourceError } = await admin.from("contact_enrichment_sources").insert(sourceRows);
        if (sourceError) throw sourceError;

        const socialRows = sources
          .map((s) => ({ source: s, platform: platformFromUrl(s.url) }))
          .filter((x) => x.platform)
          .map((x) => ({
            user_id: contact.user_id,
            import_id: contact.import_id,
            contact_id: contact.id,
            platform: x.platform,
            profile_url: x.source.url,
            display_name: x.source.title,
            headline: x.source.snippet,
            source_type: x.source.source_type === "manual" ? "manual" : "public_search",
            confidence: x.source.confidence,
            metadata: { query: x.source.query },
          }));

        if (socialRows.length) {
          await admin.from("contact_social_profiles").insert(socialRows);
        }
      }

      await admin.from("contact_records").update({ research_status: "complete", assessment_status: "queued" }).eq("id", contact.id);

      const assessment = await buildContactAssessment({
        contact,
        evidenceSources: sources.map((s) => ({ title: s.title, snippet: s.snippet, url: s.url, source_type: s.source_type })),
      });
      await upsertAssessment(admin, contact, assessment, modelName);

      researched++;
      await logEvent(admin, job, "research_contact_complete", "Research complete for contact", { sources: sources.length }, contact.id);
    } catch (contactError) {
      failed++;
      await admin.from("contact_records").update({ research_status: "failed" }).eq("id", contact.id);
      await logEvent(admin, job, "research_contact_failed", contactError instanceof Error ? contactError.message : String(contactError), {}, contact.id);
    }
  }

  const { count: researchedCount } = await admin
    .from("contact_records")
    .select("id", { count: "exact", head: true })
    .eq("import_id", job.import_id)
    .eq("research_status", "complete");

  await admin
    .from("contact_imports")
    .update({ status: "ready", researched_count: researchedCount || researched })
    .eq("id", job.import_id);

  await logEvent(admin, job, "research_complete", "Research job complete", { researched, failed });
}

async function assessSingleContact(admin: any, job: any) {
  const { data: contact, error } = await admin
    .from("contact_records")
    .select("*")
    .eq("id", job.contact_id)
    .eq("user_id", job.user_id)
    .single();
  if (error) throw error;

  const { data: evidence } = await admin
    .from("contact_enrichment_sources")
    .select("title,snippet,url,source_type")
    .eq("contact_id", contact.id)
    .limit(10);

  const assessment = await buildContactAssessment({ contact, evidenceSources: evidence || [] });
  const modelName = Deno.env.get("OPENAI_SMALL_MODEL") || Deno.env.get("OPENAI_TEXT_MODEL") || "deterministic";
  await upsertAssessment(admin, contact, assessment, modelName);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    assertWorkerSecret(req);
    const admin = getSupabaseAdmin();

    const { data: jobs, error } = await admin.rpc("claim_next_contact_job", { worker_name: workerName });
    if (error) throw error;

    const job = jobs?.[0];
    if (!job) return json({ claimed: false, message: "No queued jobs" });

    try {
      await logEvent(admin, job, "job_claimed", `Job claimed by ${workerName}`);

      if (job.job_type === "assess_import_contacts") {
        await assessImportContacts(admin, job);
      } else if (job.job_type === "research_contacts") {
        await researchContacts(admin, job);
      } else if (job.job_type === "assess_single_contact") {
        await assessSingleContact(admin, job);
      } else {
        throw new Error(`Unsupported job type: ${job.job_type}`);
      }

      await completeJob(admin, job, "complete");
      return json({ claimed: true, job_id: job.id, status: "complete" });
    } catch (jobError) {
      const message = jobError instanceof Error ? jobError.message : String(jobError);
      const retry = job.attempts + 1 < job.max_attempts;
      await logEvent(admin, job, retry ? "job_retry" : "job_failed", message);
      await completeJob(admin, job, retry ? "retry" : "failed", message);
      return json({ claimed: true, job_id: job.id, status: retry ? "retry" : "failed", error: message }, retry ? 200 : 500);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized worker") {
      return json({ error: "Unauthorized worker" }, 401);
    }
    return serverError(error);
  }
});

function assertWorkerSecret(req: Request) {
  const expected = Deno.env.get("CONTACT_WORKER_SECRET");
  const actual = req.headers.get("x-contact-worker-secret");
  if (!expected || actual !== expected) {
    throw new Error("Unauthorized worker");
  }
}
