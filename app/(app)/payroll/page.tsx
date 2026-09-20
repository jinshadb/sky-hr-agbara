import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import GeneratePayrollForm from "./generate-form";
import ExportButton from "./export-button";

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  await requireProfile(["hr_admin", "payroll_user"]);
  const supabase = createClient();
  const now = new Date();
  const month = Number(searchParams.month) || now.getMonth() + 1;
  const year = Number(searchParams.year) || now.getFullYear();

  const { data: period } = await supabase
    .from("payroll_periods")
    .select("id, status, generated_at")
    .eq("period_month", month)
    .eq("period_year", year)
    .maybeSingle();

  let summary: any[] = [];
  if (period) {
    const { data } = await supabase
      .from("payroll_attendance_summary")
      .select("present_days, absent_days, leave_paid_days, leave_unpaid_days, half_days, paid_days, unpaid_days, ot_hours, deduction_days, employees(employee_id, name, payroll_id, departments(name))")
      .eq("payroll_period_id", period.id)
      .order("employee_id");
    summary = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Monthly Payroll Attendance</h1>
        <p className="text-sm text-slate-500">
          Computed from approved, locked attendance — export straight to your existing payroll process.
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <GeneratePayrollForm defaultMonth={month} defaultYear={year} />
        {summary.length > 0 && <ExportButton rows={summary} month={month} year={year} />}
      </div>

      {period && (
        <p className="text-sm text-slate-500">
          Period status: <b>{period.status}</b>
          {period.generated_at && ` · generated ${new Date(period.generated_at).toLocaleString()}`}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Leave (paid)</th>
              <th>Leave (unpaid)</th>
              <th>Half days</th>
              <th>Paid days</th>
              <th>Unpaid days</th>
              <th>OT hrs</th>
              <th>Deduction days</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s: any, i: number) => (
              <tr key={i}>
                <td>{s.employees?.employee_id}</td>
                <td>{s.employees?.name}</td>
                <td>{s.employees?.departments?.name ?? "—"}</td>
                <td>{s.present_days}</td>
                <td>{s.absent_days}</td>
                <td>{s.leave_paid_days}</td>
                <td>{s.leave_unpaid_days}</td>
                <td>{s.half_days}</td>
                <td>{s.paid_days}</td>
                <td>{s.unpaid_days}</td>
                <td>{s.ot_hours}</td>
                <td>{s.deduction_days}</td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-slate-400 py-6">
                  No payroll summary generated for this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
