import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { toCsv } from "../_shared/csv.ts";
import { displayNameForContact, isPreLicensedRecruit, missingInfoFor, prospectStatusFor, whyThisCategory } from "../_shared/contactPresentation.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (req.method !== "POST") return badRequest("Use POST");

    let auth;
    try {
      auth = await requireUser(req);
    } catch (_error) {
      return unauthorized();
    }

    const body = await req.json().catch(() => ({}));
    const importId = body.import_id;
    if (!importId) return badRequest("Missing import_id");

    const { data: importRow, error: importError } = await auth.supabase
      .from("contact_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRow) return notFound("Import not found");

    const admin = getSupabaseAdmin();

    const { data: contacts, error: contactError } = await admin
      .from("contact_records")
      .select("*")
      .eq("import_id", importId)
      .eq("user_id", auth.user.id)
      .order("row_number", { ascending: true })
      .limit(50000);

    if (contactError) throw contactError;

    const contactIds = (contacts || []).map((c: any) => c.id);
    const { data: assessments, error: assessmentError } = contactIds.length
      ? await admin.from("contact_ai_assessments").select("*").in("contact_id", contactIds)
      : { data: [], error: null } as any;
    if (assessmentError) throw assessmentError;

    const { data: sources, error: sourceError } = contactIds.length
      ? await admin.from("contact_enrichment_sources").select("contact_id,url,title,snippet,provider").in("contact_id", contactIds).limit(100000)
      : { data: [], error: null } as any;
    if (sourceError) throw sourceError;

    const assessmentByContact = new Map((assessments || []).map((a: any) => [a.contact_id, a]));
    const sourcesByContact = new Map<string, any[]>();
    for (const source of sources || []) {
      sourcesByContact.set(source.contact_id, [...(sourcesByContact.get(source.contact_id) || []), source]);
    }

    const rows = (contacts || []).map((c: any) => {
      const a = assessmentByContact.get(c.id) || {};
      const preLicensedRecruit = isPreLicensedRecruit(c);
      const s = sourcesByContact.get(c.id) || [];
      return {
        display_name: displayNameForContact(c),
        prospect_status: prospectStatusFor(c, a),
        full_name: c.full_name,
        first_name: c.first_name,
        last_name: c.last_name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        state: c.state,
        company: c.company,
        job_title: c.job_title,
        gender_label_display_only: c.gender_label,
        gender_source: c.gender_source,
        married_status_display_only: c.married_status,
        homeowner_status_display_only: c.homeowner_status,
        contact_type: c.contact_type,
        follow_up_date: c.follow_up_date,
        linkedin_url: c.linkedin_url,
        website_url: c.website_url,
        research_status: c.research_status,
        assessment_status: c.assessment_status,
        captive_status: a.captive_status,
        candidate_type: a.candidate_type,
        priority_tier: a.priority_tier,
        why_this_category: preLicensedRecruit
          ? "The CSV identifies this contact as an active Life insurance producer with license/NPN context, so PulseNow treats them as a pre-licensed recruit before web research. Use NIPR for official verification when needed."
          : whyThisCategory(a),
        partner_score: a.life_insurance_partner_score,
        educator_score: a.financial_educator_score,
        client_prospect_score: a.client_prospect_score,
        referral_partner_score: a.referral_partner_score,
        manual_review_required: a.manual_review_required,
        next_best_action: a.next_best_action,
        suggested_message_angle: a.suggested_message_angle,
        evidence_summary: a.evidence_summary,
        confidence: a.confidence,
        compliance_flags: Array.isArray(a.compliance_flags) ? a.compliance_flags.join(" | ") : "",
        missing_data: missingInfoFor(c, a).join(" | "),
        source_urls: s.map((x) => x.url).filter(Boolean).join(" | "),
        notes: c.notes,
        do_not_contact: c.do_not_contact,
        email_opt_out: c.email_opt_out,
        sms_opt_out: c.sms_opt_out,
      };
    });

    const csv = toCsv(rows);
    const path = `${auth.user.id}/${importId}/organized_contacts_${Date.now()}.csv`;

    const { error: uploadError } = await admin.storage
      .from("contact_exports")
      .upload(path, new Blob([csv], { type: "text/csv" }), { upsert: true, contentType: "text/csv" });
    if (uploadError) throw uploadError;

    const { data: exportRow, error: exportError } = await admin
      .from("contact_exports")
      .insert({
        user_id: auth.user.id,
        import_id: importId,
        export_type: body.export_type || "organized_csv",
        file_path: path,
        row_count: rows.length,
      })
      .select("*")
      .single();
    if (exportError) throw exportError;

    const { data: signed, error: signedError } = await admin.storage
      .from("contact_exports")
      .createSignedUrl(path, 60 * 60);
    if (signedError) throw signedError;

    return json({
      export: exportRow,
      signed_url: signed.signedUrl,
      row_count: rows.length,
    });
  } catch (error) {
    return serverError(error);
  }
});
