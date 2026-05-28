import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const ALLOWED_FIELDS = new Set([
  "first_name", "last_name", "full_name", "email", "phone", "phone_e164", "city", "state", "zip",
  "company", "job_title", "occupation", "contact_type", "follow_up_date", "notes",
  "gender_label", "original_gender_label", "gender_source", "married_status", "homeowner_status",
  "linkedin_url", "facebook_url", "instagram_url", "website_url",
  "email_opt_out", "sms_opt_out", "do_not_contact", "consent_source",
]);

const ENUM_FIELDS: Record<string, Set<string>> = {
  gender_label: new Set(["man", "woman", "nonbinary", "other", "unknown", "not_provided"]),
  gender_source: new Set(["manual", "self_stated_note", "not_provided"]),
  married_status: new Set(["yes", "no", "unknown", "not_provided"]),
  homeowner_status: new Set(["yes", "no", "unknown", "not_provided"]),
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (!["PATCH", "POST"].includes(req.method)) return badRequest("Use PATCH or POST");

    let auth;
    try {
      auth = await requireUser(req);
    } catch (_error) {
      return unauthorized();
    }

    const body = await req.json().catch(() => ({}));
    const contactId = body.contact_id;
    const patch = body.patch || {};
    const reassess = body.reassess !== false;

    if (!contactId) return badRequest("Missing contact_id");

    const { data: before, error: beforeError } = await auth.supabase
      .from("contact_records")
      .select("*")
      .eq("id", contactId)
      .single();

    if (beforeError || !before) return notFound("Contact not found");

    const cleanPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_FIELDS.has(key)) cleanPatch[key] = value;
    }

    if (Object.keys(cleanPatch).length === 0) return badRequest("No allowed fields in patch");

    for (const [key, allowed] of Object.entries(ENUM_FIELDS)) {
      const value = cleanPatch[key];
      if (value !== undefined && value !== null && !allowed.has(String(value))) {
        return badRequest(`Invalid ${key}`);
      }
    }

    if (cleanPatch.gender_label || cleanPatch.original_gender_label) {
      cleanPatch.gender_source = cleanPatch.gender_source === "self_stated_note" ? "self_stated_note" : "manual";
    } else if (cleanPatch.gender_source === "self_stated_note" && !cleanPatch.notes && !before.notes) {
      return badRequest("gender_source self_stated_note requires notes");
    } else if (cleanPatch.gender_source && cleanPatch.gender_source !== "not_provided") {
      cleanPatch.gender_source = "manual";
    }

    const admin = getSupabaseAdmin();
    const { data: updated, error: updateError } = await admin
      .from("contact_records")
      .update({ ...cleanPatch, assessment_status: reassess ? "queued" : before.assessment_status })
      .eq("id", contactId)
      .eq("user_id", auth.user.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await admin.from("contact_audit_log").insert({
      user_id: auth.user.id,
      import_id: before.import_id,
      contact_id: contactId,
      action: "manual_contact_update",
      before_json: before,
      after_json: updated,
      metadata: { patch_keys: Object.keys(cleanPatch) },
    });

    let job = null;
    if (reassess) {
      const { data, error } = await admin
        .from("contact_jobs")
        .insert({
          user_id: auth.user.id,
          import_id: before.import_id,
          contact_id: contactId,
          job_type: "assess_single_contact",
          status: "queued",
          priority: 30,
          payload: { reason: "manual_update" },
        })
        .select("*")
        .single();
      if (error) throw error;
      job = data;
    }

    return json({ contact: updated, job });
  } catch (error) {
    return serverError(error);
  }
});
