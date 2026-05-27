import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

function safeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140) || "contacts.csv";
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
    const filename = safeFileName(body.filename || "contacts.csv");
    const mimeType = body.mime_type || "text/csv";

    if (!importId) return badRequest("Missing import_id");

    const { data: importRow, error: importError } = await auth.supabase
      .from("contact_imports")
      .select("id,user_id")
      .eq("id", importId)
      .single();

    if (importError || !importRow) return notFound("Import not found");

    const admin = getSupabaseAdmin();
    const path = `${auth.user.id}/${importId}/${Date.now()}_${filename}`;

    const { data, error } = await admin.storage
      .from("contact_imports")
      .createSignedUploadUrl(path, { upsert: true });

    if (error) throw error;

    const { error: updateError } = await auth.supabase
      .from("contact_imports")
      .update({
        status: "upload_url_created",
        source_file_path: path,
        original_filename: filename,
        mime_type: mimeType,
      })
      .eq("id", importId);

    if (updateError) throw updateError;

    return json({
      import_id: importId,
      bucket: "contact_imports",
      path,
      signed_url: data.signedUrl,
      token: data.token,
    });
  } catch (error) {
    return serverError(error);
  }
});
