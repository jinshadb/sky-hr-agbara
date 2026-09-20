import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function ReconciliationPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireProfile(["hr_admin", "hr_officer", "canteen_user", "management"]);
  const supabase = createClient();
  const date = searchParams.date || new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("daily_reconciliation")
    .select("*")
    .eq("work_date", date)
    .order("ticket_number");

  const totals = (rows ?? []).reduce(
    (acc, r: any) => ({
      authorized: acc.authorized + r.authorized,
      served: acc.served + r.served,
    }),
    { authorized: 0, served: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Daily Reconciliation</h1>
          <p className="text-sm text-slate-500">
            Authorized meals vs. meals served — calculated automatically, no manual Excel entry.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <label className="text-sm">Date</label>
          <input type="date" name="date" defaultValue={date} className="input w-auto" />
          <button className="btn-secondary" type="submit">
            Go
          </button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-slate-500">Total authorized</p>
          <p className="text-2xl font-semibold">{totals.authorized}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Total served</p>
          <p className="text-2xl font-semibold text-green-600">{totals.served}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Overall utilization</p>
          <p className="text-2xl font-semibold">
            {totals.authorized > 0 ? Math.round((totals.served / totals.authorized) * 1000) / 10 : 0}%
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Department</th>
              <th>Meal</th>
              <th>Authorized</th>
              <th>Served</th>
              <th>Balance</th>
              <th>Variance</th>
              <th>Utilization %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.ticket_id}>
                <td className="font-medium">{r.ticket_number}</td>
                <td>{r.department_name ?? "All"}</td>
                <td className="capitalize">{r.meal_type}</td>
                <td>{r.authorized}</td>
                <td>{r.served}</td>
                <td>{r.balance}</td>
                <td className={r.variance !== 0 ? "text-amber-600 font-medium" : ""}>{r.variance}</td>
                <td>{r.utilization_pct}%</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-6">
                  No tickets for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
