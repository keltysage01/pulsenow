import { getSupabaseForUser } from "./supabaseAdmin.ts";

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const supabase = getSupabaseForUser(authHeader);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Invalid session");
  }

  return {
    user: data.user,
    supabase,
    authHeader,
  };
}
