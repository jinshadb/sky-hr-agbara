import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import ScanClient from "./scan-client";

export default async function CanteenScanPage() {
  await requireProfile(["hr_admin", "canteen_user"]);
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tickets } = await supabase
    .from("canteen_tickets")
    .select("*, departments(name), shifts(name)")
    .eq("work_date", today)
    .eq("status", "active")
    .order("ticket_number");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Canteen — Meal Distribution</h1>
        <p className="text-sm text-slate-500">Today, {today}</p>
      </div>
      <ScanClient tickets={tickets ?? []} />
    </div>
  );
}
