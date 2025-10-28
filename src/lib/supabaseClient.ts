import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- ADD THESE LOGS ---
console.log("SupabaseClient: URL read from .env:", supabaseUrl);
console.log("SupabaseClient: Anon Key read from .env:", supabaseAnonKey ? "Key found (hidden)" : "Key NOT found");
// --- END OF LOGS ---

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing from .env file. (Did you forget VITE_ prefix?)")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)