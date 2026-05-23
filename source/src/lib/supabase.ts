import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  supabaseUrl.indexOf('your-project-ref') === -1 &&
  typeof supabaseKey === 'string' &&
  supabaseKey.length > 0 &&
  supabaseKey.indexOf('your-public-anon-key') === -1;

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseKey as string)
  : null;
