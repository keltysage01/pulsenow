/**
 * Database types for Pulsenow.
 *
 * The proper way to populate this file is to run the Supabase type generator
 * AFTER you've applied both migrations:
 *
 *   npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
 *
 * Or if you have the Supabase CLI installed and linked:
 *
 *   npx supabase gen types typescript --linked > types/database.ts
 *
 * Then import as:
 *
 *   import type { Database } from "@/types/database";
 *   const supa = createClient<Database>(...)
 *
 * Without this, the supabase client uses `any` for query results and you
 * lose autocomplete. The backend still works, but types are weaker.
 *
 * For now, this file exports a minimal Database type so the existing routes
 * compile. Replace with the generated types once you've run the command.
 */

export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, { Row: any }>;
    Functions: Record<string, any>;
    Enums: Record<string, never>;
  };
};
