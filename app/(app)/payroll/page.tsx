import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import ExportButton from "./export-button";

type DayRecord = {
  date: string;
  first_in: string | null;
  last_out: string | null;
  hours: number | null;
  status: string;
};

type AttendanceRow = {
  employee_id: string;
  name: string;
  employment_type: string;
  department: string;
  total_hours: number;
  days: Record<string, DayRecord>;
};

export default async function FinalAttendancePage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  await requireProfile(["hr_admin", "hr_officer", "payroll_user", "management"]);
  const supabase = createClient();
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(searchParams.month) || now.getMonth() + 1));
  const year = Number(searchParams.year) || now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-${daysInMonth}`;
  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
  );

  const [{ data: approved }, { data: biometric }] = await Promise.all([
    supabase
      .from("approved_attendance")
      .select(
        "employee_id, work_date, status, hours_worked, employees(employee_id, name, employment_type, departments(name))"
      )
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date"),
    supabase
      .from("biometric_records")
      .select("employee_id, work_date, first_in, last_out, hours_worked")
      .gte("work_date", from)
      .lte("work_date", to)
      .eq("is_duplicate", false)
      .eq("is_unknown", false),
  ]);

  const biometricByEmployeeDate = new Map<string, any>();
  for (const b of biometric ?? []) {
    if (b.employee_id) biometricByEmployeeDate.set(`${b.employee_id}|${b.work_date}`, b);
  }

  const byEmployee = new Map<string, AttendanceRow>();
  for (const a of approved ?? []) {
    const employee = a.employees as any;
    if (!employee) continue;
    let row = byEmployee.get(a.employee_id);
    if (!row) {
      row = {
        employee_id: employee.employee_id,
        name: employee.name,
        employment_type: employee.employment_type,
        department: employee.departments?.name ?? "—",
        total_hours: 0,
        days: {},
      };
      byEmployee.set(a.employee_id, row);
    }

    const scan = biometricByEmployeeDate.get(`${a.employee_id}|${a.work_date}`);
    const hours = scan?.hours_worked == null
      ? (a.hours_worked == null ? null : Number(a.hours_worked))
      : Number(scan.hours_worked);
    row.days[a.work_date] = {
      date: a.work_date,
      first_in: scan?.first_in ?? null,
      last_out: scan?.last_out ?? null,
      hours,
      status: a.status,
    };
    row.total_hours += hours ?? 0;
  }

  const rows = Array.from(byEmployee.values()).sort((a, b) =>
    a.employee_id.localeCompare(b.employee_id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Final Attendance Register</h1>
          <p className="text-sm text-slate-500">
            Approved biometric IN/OUT records and automatically calculated daily hours.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <label className="text-sm">
            Month
            <select name="month" defaultValue={month} className="input block mt-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Year
            <input name="year" type="number" defaultValue={year} className="input block mt-1 w-24" />
          </label>
          <button className="btn-secondary" type="submit">View</button>
          {rows.length > 0 && <ExportButton rows={rows} dates={dates} month={month} year={year} />}
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 min-w-24">Employee ID</th>
              <th className="sticky left-24 bg-white z-10 min-w-40">Name</th>
              <th>Type</th>
              <th>Department</th>
              {dates.map((date) => (
                <th key={date} className="min-w-24 text-center">
                  {Number(date.slice(-2))}
                </th>
              ))}
              <th>Total hrs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee_id}>
                <td className="sticky left-0 bg-white font-medium">{row.employee_id}</td>
                <td className="sticky left-24 bg-white">{row.name}</td>
                <td className="capitalize">{row.employment_type}</td>
                <td>{row.department}</td>
                {dates.map((date) => {
                  const day = row.days[date];
                  return (
                    <td key={date} className="text-center align-top">
                      {day ? (
                        <div className="space-y-0.5">
                          <div>IN {day.first_in?.slice(0, 5) ?? "—"}</div>
                          <div>OUT {day.last_out?.slice(0, 5) ?? "—"}</div>
                          <div className="font-semibold">{day.hours == null ? "—" : `${day.hours.toFixed(2)}h`}</div>
                          <div className="capitalize text-slate-400">{day.status.replace("_", " ")}</div>
                        </div>
                      ) : "—"}
                    </td>
                  );
                })}
                <td className="font-semibold">{row.total_hours.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 5} className="text-center text-slate-400 py-8">
                  No approved attendance records for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
