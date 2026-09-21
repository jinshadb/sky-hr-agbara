import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

// SERVICE ROLE client. Bypasses Row Level Security entirely.
// Only ever import this inside server actions / route handlers that need it
// for a specific, audited reason (bulk biometric import, user invitation,
// payroll export). Never import it into any client component.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
