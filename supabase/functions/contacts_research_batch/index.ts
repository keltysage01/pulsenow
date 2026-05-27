import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

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
    const contactIds = Array.isArray(body.contact_ids) ? body.contact_ids : undefined;
    const limit = Math.min(Number(body.limit || Deno.env.get("CONTACT_MAX_RESEARCH_PER_JOB") || "25"), 100);

    if (!importId) return badRequest("Missing import_id");

    const { data: importRow, error: importError } = await auth.supabase
      .from("contact_imports")
      .select("id,user_id")
      .eq("id", importId)
      .single();

    if (importError || !importRow) return notFound("Import not found");

    const admin = getSupabaseAdmin();

    if (contactIds?.length) {
      await admin
        .from("contact_records")
        .update({ research_status: "queued" })
        .eq("import_id", importId)
        .eq("user_id", auth.user.id)
        .in("id", contactIds);
    } else {
      // Queue a limited set only. Avoid accidentally researching thousands from one button click.
      const { data: contacts } = await admin
        .from("contact_records")
        .select("id")
        .eq("import_id", importId)
        .eq("user_id", auth.user.id)
        .eq("research_status", "not_started")
        .neq("do_not_contact", true)
        .limit(limit);

      const ids = (contacts || []).map((c: any) => c.id);
      if (ids.length) {
        await admin.from("contact_records").update({ research_status: "queued" }).in("id", ids);
      }
    }

    const { data: job, error: jobError } = await admin
      .from("contact_jobs")
      .insert({
        user_id: auth.user.id,
        import_id: importId,
        job_type: "research_contacts",
        status: "queued",
        priority: 20,
        payload: { contact_ids: contactIds, limit },
      })
      .select("*")
      .single();

    if (jobError) throw jobError;

    await admin.from("contact_imports").update({ status: "researching" }).eq("id", importId).eq("user_id", auth.user.id);

    return json({ job });
  } catch (error) {
    return serverError(error);
  }
});
