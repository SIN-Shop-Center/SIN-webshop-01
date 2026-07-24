import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { EdgeEnv } from "./env.ts";

export function createServiceClient(env: EdgeEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
