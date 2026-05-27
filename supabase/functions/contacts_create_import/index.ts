import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";

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
    const title = body.title || "Contact Import";
    const default_goal = body.default_goal || "life_insurance_partner";

    const { data, error } = await auth.supabase
      .from("contact_imports")
      .insert({
        user_id: auth.user.id,
        title,
        default_goal,
        status: "created",
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select("*")
      .single();

    if (error) throw error;

    return json({ import: data });
  } catch (error) {
    return serverError(error);
  }
});
