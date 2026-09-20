import { createClient } from "@/lib/supabase/server";
import { requireProfile, ROLE_LABELS } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  if (profile.role === "canteen_user") {
    const { data: tickets } = await supabase
      .from("daily_reconciliation")
      .select("*")
      .eq("work_date", today);
    const totals = (tickets ?? []).reduce(
      (a, t: any) => ({ authorized: a.authorized + t.authorized, served: a.served + t.served }),
      { authorized: 0, served: 0 }
    );
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Canteen Dashboard</h1>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Authorized meals" value={totals.authorized} />
          <Stat label="Served" value={totals.served} color="text-green-600" />
          <Stat label="Balance" value={Math.max(totals.authorized - totals.served, 0)} />
        </div>
      </div>
    );
  }

  if (profile.role === "management") {
    const { data: attendance } = await supabase
      .from("approved_attendance")
      .select("status")
      .eq("work_date", today);
    const present = (attendance ?? []).filter((a) => a.status === "present" || a.status === "half_day").length;
    const absent = (attendance ?? []).filter((a) => a.status === "absent").length;
    const leave = (attendance ?? []).filter((a) => a.status === "leave").length;
    const { data: recon } = await supabase.from("daily_reconciliation").select("authorized, served").eq("work_date", today);
    const mealAuthorized = (recon ?? []).reduce((a, r: any) => a + r.authorized, 0);
    const mealServed = (recon ?? []).reduce((a, r: any) => a + r.served, 0);

    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Management Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Present" value={present} color="text-green-600" />
          <Stat label="Absent" value={absent} color="text-red-600" />
          <Stat label="Leave" value={leave} />
          <Stat label="Meals authorized" value={mealAuthorized} />
          <Stat label="Meals served" value={mealServed} />
        </div>
      </div>
    );
  }

  // HR Admin / HR Officer / Department Head / Payroll User
  let headcountQuery = supabase
    .from("daily_headcount")
    .select("biometric_headcount, verified_headcount, status, department_id, departments(name)")
    .eq("work_date", today);
  if (profile.role === "department_head" && profile.department_id) {
    headcountQuery = headcountQuery.eq("department_id", profile.department_id);
  }
  const { data: headcount } = await headcountQuery;

  const pending = (headcount ?? []).filter((h) => h.status === "pending").length;
  const approved = (headcount ?? []).filter((h) => h.status === "approved").length;
  const totalBiometric = (headcount ?? []).reduce((a, h) => a + h.biometric_headcount, 0);
  const totalVerified = (headcount ?? []).reduce((a, h) => a + (h.verified_headcount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {ROLE_LABELS[profile.role]} Dashboard
        </h1>
        <p className="text-sm text-slate-500">Today, {today}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Biometric headcount" value={totalBiometric} />
        <Stat label="Verified headcount" value={totalVerified} />
        <Stat label="Pending verification" value={pending} color="text-amber-600" />
        <Stat label="Approved" value={approved} color="text-green-600" />
      </div>
      <div className="card overflow-x-auto">
        <h2 className="font-medium mb-2">Department / shift breakdown</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Department</th>
              <th>Biometric</th>
              <th>Verified</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(headcount ?? []).map((h: any, i: number) => (
              <tr key={i}>
                <td>{h.departments?.name ?? "—"}</td>
                <td>{h.biometric_headcount}</td>
                <td>{h.verified_headcount ?? "—"}</td>
                <td>{h.status}</td>
              </tr>
            ))}
            {(!headcount || headcount.length === 0) && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-6">
                  No attendance uploaded for today yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
