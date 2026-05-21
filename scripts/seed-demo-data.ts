/**
 * Seed demo data for Pulsenow.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 *
 * Creates:
 *   - A demo org "Pulsenow Demo"
 *   - 3 demo profiles (1 leader, 2 agents)
 *   - 30 demo contacts spread across the agents
 *   - Mock enrichment data on half of them
 *   - A week of activity log entries
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env. Never run in production.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}
const svc = createClient(url, key, { auth: { persistSession: false } });

const FIRST_NAMES = [
  "Ashley","Brittany","Crystal","Danielle","Emily","Faith","Grace","Hannah",
  "Isabella","Jessica","Kayla","Lauren","Megan","Nicole","Olivia","Paige",
];
const LAST_NAMES = [
  "Anderson","Brown","Carter","Davis","Edwards","Foster","Garcia","Hill",
  "Johnson","King","Lopez","Miller","Nelson","Owens","Parker","Reed",
];
const CITIES = ["Boise","Meridian","Nampa","Caldwell","Eagle","Star","Kuna"];
const CARRIERS = [
  { name: "State Farm", captive: "captive" },
  { name: "Allstate", captive: "captive" },
  { name: "Farmers Insurance", captive: "captive" },
  { name: "Northwestern Mutual", captive: "captive" },
  { name: "Idaho Independent Brokers LLC", captive: "independent" },
  { name: "Treasure Valley Insurance Group", captive: "independent" },
  { name: "Mountain West Financial", captive: "independent" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding Pulsenow demo data...");

  // 1. create org
  const slug = "pulsenow-demo";
  let { data: org } = await svc.from("organizations").select("*").eq("slug", slug).maybeSingle();
  if (!org) {
    const { data, error } = await svc
      .from("organizations")
      .insert({ name: "Pulsenow Demo", slug, plan: "free" })
      .select()
      .single();
    if (error) throw error;
    org = data;
  }
  console.log("Org:", org.id);

  // 2. profiles (you'd normally tie these to real auth.users; for demo we just use uuids)
  // NOTE: In a real setup the auth.users row must exist first. This script
  // creates orphan profiles for visual demo only. Remove this section if you
  // are running against production auth.
  const demoProfiles = [
    { full_name: "Demo Leader",  agent_code: "LEAD1", role: "leader" as const },
    { full_name: "Demo Agent A", agent_code: "AGTA1", role: "agent" as const },
    { full_name: "Demo Agent B", agent_code: "AGTB1", role: "agent" as const },
  ];

  console.log("Skipping profile seed (requires real auth.users rows).");
  console.log("Create users via Supabase Auth first, then POST /api/onboarding.");

  // 3. create demo contacts under your own profile (pass via env)
  const ownerId = process.env.SEED_OWNER_PROFILE_ID;
  if (!ownerId) {
    console.log("Set SEED_OWNER_PROFILE_ID=<your_profile_id> to seed contacts under it.");
    return;
  }

  const contacts = Array.from({ length: 30 }, (_, i) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const carrier = pick(CARRIERS);
    const married = Math.random() > 0.4;
    return {
      contact: {
        profile_id: ownerId,
        org_id: org.id,
        first_name: first,
        last_name: last,
        phone: `208555${String(1000 + i).padStart(4, "0")}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        city: pick(CITIES),
        state: "ID",
        source: "purchased_list",
        contact_type: "recruit",
        stage: "uncontacted",
        qualifiers: {
          married,
          age_25_plus: Math.random() > 0.2,
          children: married && Math.random() > 0.4,
          homeowner: Math.random() > 0.5,
          income_40k: Math.random() > 0.3,
          entrepreneurial: Math.random() > 0.6,
          dissatisfied: Math.random() > 0.5,
        },
      },
      producer: {
        license_number: `L${100000 + i}`,
        license_states: ["ID"],
        license_type: "life",
        current_carrier: carrier.name,
        captive_status: carrier.captive,
        gender: Math.random() > 0.5 ? "female" : "male",
      },
    };
  });

  const { data: inserted, error: cErr } = await svc
    .from("contacts")
    .insert(contacts.map((c) => c.contact))
    .select();
  if (cErr) throw cErr;
  console.log(`Inserted ${inserted.length} contacts`);

  await svc.from("producer_details").insert(
    inserted.map((c: any, i: number) => ({ contact_id: c.id, ...contacts[i].producer }))
  );

  // 4. seed some activity for the week
  const now = new Date();
  for (let d = 0; d < 5; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    await svc.from("points_ledger").insert({
      profile_id: ownerId,
      points: Math.floor(Math.random() * 15) + 5,
      source: "contact_block",
      awarded_at: day.toISOString(),
    });
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
