import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";
import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, serverError } from "../_shared/respond.ts";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const AUTH_DOMAIN = "pulsenow.app";
const PASSWORD_SUFFIX = "-PulseNow-2026";

function credential(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (req.method !== "POST") return badRequest("Use POST");

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const agentCode = String(body.agent_code || body.agentCode || "").trim();
    const leaderCode = String(body.leader_code || body.leaderCode || "").trim();
    const pin = String(body.pin || "").trim();

    if (name.length < 2 || agentCode.length < 2 || !/^\d{4}$/.test(pin)) {
      return badRequest("Name, agent code, and a 4-digit PIN are required.");
    }

    const email = `${credential(agentCode)}@${AUTH_DOMAIN}`;
    const password = `${pin}${PASSWORD_SUFFIX}`;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, agent_code: agentCode, leader_code: leaderCode || null },
    });

    if (created.error) {
      if (/already registered|already exists|User already/i.test(created.error.message || "")) {
        return json({ ok: false, error: "agent_code_exists", message: "That agent code already has an account." }, 409);
      }
      throw created.error;
    }

    const user = created.data.user;
    const profile = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        org_id: DEFAULT_ORG_ID,
        full_name: name,
        agent_code: agentCode,
        leader_code: leaderCode || null,
        role: "agent",
        level: "TA",
        email,
        app_state: {
          name,
          agent_code: agentCode,
          leader_code: leaderCode || null,
          auth_source: "supabase_edge_register",
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select("id,org_id,full_name,agent_code,leader_code,role,level,email,phone,avatar_url,bio,mission_statement,app_state")
      .single();

    if (profile.error) throw profile.error;

    return json({ ok: true, email, profile: profile.data });
  } catch (error) {
    return serverError(error);
  }
});
