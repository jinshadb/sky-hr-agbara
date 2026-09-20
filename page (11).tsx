import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import HeadcountRow from "./headcount-row";

export default async function HeadcountPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const profile = await requireProfile(["hr_admin", "hr_officer", "department_head"]);
  const supabase = createClient();
  const date = searchParams.date || new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("daily_headcount")
    .select("*, departments(name), shifts(name)")
    .eq("work_date", date)
    .order("department_id");

  if (profile.role === "department_head" && profile.department_id) {
    query = query.eq("department_id", profile.department_id);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Headcount Verification</h1>
          <p className="text-sm text-slate-500">
            Biometric headcount is automatic. Enter only the physically verified count and a
            reason for any difference, then approve — that becomes the official attendance.
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

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Department</th>
              <th>Shift</th>
              <th>Biometric</th>
              <th>Verified</th>
              <th>Difference</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <HeadcountRow
                key={r.id}
                id={r.id}
                department={r.departments?.name ?? "—"}
                shift={r.shifts?.name ?? "—"}
                biometric={r.biometric_headcount}
                verified={r.verified_headcount}
                difference={r.difference}
                reason={r.reason}
                status={r.status}
                canApprove={profile.role !== "department_head"}
              />
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-6">
                  No headcount data for this date yet — upload biometric attendance first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
