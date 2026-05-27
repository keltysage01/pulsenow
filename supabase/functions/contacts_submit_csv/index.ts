import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { detectColumnMapping, parseCsv } from "../_shared/csv.ts";
import { normalizeContact } from "../_shared/normalize.ts";

async function downloadCsv(admin: any, path: string): Promise<string> {
  const { data, error } = await admin.storage.from("contact_imports").download(path);
  if (error) throw error;
  return await data.text();
}

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
    const rawCsvText = body.raw_csv_text;

    if (!importId) return badRequest("Missing import_id");

    const admin = getSupabaseAdmin();

    const { data: importRow, error: importError } = await auth.supabase
      .from("contact_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRow) return notFound("Import not found");

    await auth.supabase.from("contact_imports").update({ status: "parsing" }).eq("id", importId);

    const csvText = rawCsvText || await downloadCsv(admin, importRow.source_file_path);
    const parsed = parseCsv(csvText);

    if (!parsed.headers.length) {
      await auth.supabase.from("contact_imports").update({ status: "failed", metadata: { parse_errors: parsed.errors } }).eq("id", importId);
      return badRequest("CSV has no headers", parsed.errors);
    }

    const { mapping, unmappedHeaders } = detectColumnMapping(parsed.headers);

    const { error: mappingError } = await admin
      .from("contact_import_column_mappings")
      .upsert({
        import_id: importId,
        user_id: auth.user.id,
        detected_mapping: mapping,
        user_mapping: body.user_mapping || {},
        unmapped_headers: unmappedHeaders,
      }, { onConflict: "import_id" });

    if (mappingError) throw mappingError;

    const finalMapping = body.user_mapping && Object.keys(body.user_mapping).length
      ? { ...mapping, ...body.user_mapping }
      : mapping;

    const seenDedupe = new Map<string, string>();
    const insertRows: Record<string, unknown>[] = [];
    let failedRows = 0;
    let duplicateRows = 0;

    parsed.rows.forEach((row, index) => {
      const normalized = normalizeContact(row, finalMapping);
      const parseStatus = normalized.normalization_errors.includes("Missing name, email, and phone") ? "needs_review" : "parsed";
      const tempId = crypto.randomUUID();
      let duplicateOf: string | null = null;
      let finalStatus = parseStatus;

      if (normalized.dedupe_key && seenDedupe.has(normalized.dedupe_key)) {
        duplicateOf = seenDedupe.get(normalized.dedupe_key)!;
        duplicateRows++;
        finalStatus = "duplicate";
      } else if (normalized.dedupe_key) {
        seenDedupe.set(normalized.dedupe_key, tempId);
      }

      if (parseStatus === "failed") failedRows++;

      insertRows.push({
        id: tempId,
        user_id: auth.user.id,
        import_id: importId,
        row_number: index + 2,
        original_row: row,
        ...normalized,
        duplicate_of_contact_id: duplicateOf,
        parse_status: finalStatus,
        assessment_status: normalized.do_not_contact ? "skipped" : "queued",
      });
    });

    // Clear prior generated data if this import is being re-submitted.
    await admin.from("contact_social_profiles").delete().eq("import_id", importId).eq("user_id", auth.user.id);
    await admin.from("contact_enrichment_sources").delete().eq("import_id", importId).eq("user_id", auth.user.id);
    await admin.from("contact_ai_assessments").delete().eq("import_id", importId).eq("user_id", auth.user.id);
    await admin.from("contact_jobs").delete().eq("import_id", importId).eq("user_id", auth.user.id);
    await admin.from("contact_records").delete().eq("import_id", importId).eq("user_id", auth.user.id);

    const batchSize = 500;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      const batch = insertRows.slice(i, i + batchSize);
      const { error } = await admin.from("contact_records").insert(batch);
      if (error) throw error;
    }

    // Insert social profiles from CSV supplied URLs.
    const socialRows: Record<string, unknown>[] = [];
    for (const row of insertRows) {
      const base = { user_id: auth.user.id, import_id: importId, contact_id: row.id, source_type: "csv", confidence: 1 };
      if (row.linkedin_url) socialRows.push({ ...base, platform: "linkedin", profile_url: row.linkedin_url });
      if (row.facebook_url) socialRows.push({ ...base, platform: "facebook", profile_url: row.facebook_url });
      if (row.instagram_url) socialRows.push({ ...base, platform: "instagram", profile_url: row.instagram_url });
      if (row.website_url) socialRows.push({ ...base, platform: "website", profile_url: row.website_url });
    }
    if (socialRows.length) {
      for (let i = 0; i < socialRows.length; i += batchSize) {
        const { error } = await admin.from("contact_social_profiles").insert(socialRows.slice(i, i + batchSize));
        if (error) throw error;
      }
    }

    const { error: updateError } = await admin
      .from("contact_imports")
      .update({
        status: "parsed",
        total_rows: parsed.rows.length,
        parsed_rows: insertRows.length,
        failed_rows: failedRows,
        duplicate_rows: duplicateRows,
        metadata: {
          headers: parsed.headers,
          parse_errors: parsed.errors,
          unmapped_headers: unmappedHeaders,
        },
      })
      .eq("id", importId)
      .eq("user_id", auth.user.id);

    if (updateError) throw updateError;

    const { data: job, error: jobError } = await admin
      .from("contact_jobs")
      .insert({
        user_id: auth.user.id,
        import_id: importId,
        job_type: "assess_import_contacts",
        status: "queued",
        priority: 10,
        payload: { limit: Number(Deno.env.get("CONTACT_MAX_ROWS_PER_JOB") || "500") },
      })
      .select("*")
      .single();

    if (jobError) throw jobError;

    return json({
      import_id: importId,
      total_rows: parsed.rows.length,
      parsed_rows: insertRows.length,
      failed_rows: failedRows,
      duplicate_rows: duplicateRows,
      mapping,
      unmapped_headers: unmappedHeaders,
      job,
    });
  } catch (error) {
    return serverError(error);
  }
});
