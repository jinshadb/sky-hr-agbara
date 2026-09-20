import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// SERVICE ROLE client. Bypasses Row Level Security entirely.
// Only ever import this inside server actions / route handlers that need it
// for a specific, audited reason (bulk biometric import, user invitation,
// payroll export). Never import it into any client component.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
