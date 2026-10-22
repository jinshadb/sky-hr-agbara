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
    const attendanceRows = (attendance ?? []) as Array<{ status: "present" | "absent" | "leave" | "half_day" }>;
    const present = attendanceRows.filter((a) => a.status === "present" || a.status === "half_day").length;
    const absent = attendanceRows.filter((a) => a.status === "absent").length;
    const leave = attendanceRows.filter((a) => a.status === "leave").length;
    const attendanceDenominator = attendanceRows.filter((a) => a.status !== "leave").length;
    const absenteeismRate = attendanceDenominator > 0
      ? ((absent / attendanceDenominator) * 100).toFixed(1) + "%"
      : "—";
    const { data: recon } = await supabase.from("daily_reconciliation").select("authorized, served").eq("work_date", today);
    const mealAuthorized = (recon ?? []).reduce((a, r: any) => a + r.authorized, 0);
    const mealServed = (recon ?? []).reduce((a, r: any) => a + r.served, 0);

    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Management Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Stat label="Present" value={present} color="text-green-600" />
          <Stat label="Absent" value={absent} color="text-red-600" />
          <Stat label="Absenteeism rate" value={absenteeismRate} color="text-red-600" />
          <Stat label="Leave" value={leave} />
          <Stat label="Meals authorized" value={mealAuthorized} />
          <Stat label="Meals served" value={mealServed} />
        </div>
        <p className="text-xs text-slate-500">
          Absenteeism rate = absent ÷ approved attendance, excluding approved leave. No approved attendance today shows as —.
        </p>
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

  const headcountRows = (headcount ?? []) as Array<{ status: "pending" | "approved"; biometric_headcount: number; verified_headcount: number | null; departments?: { name: string } | null }>;
  const pending = headcountRows.filter((h) => h.status === "pending").length;
  const approved = headcountRows.filter((h) => h.status === "approved").length;
  const totalBiometric = headcountRows.reduce((a, h) => a + h.biometric_headcount, 0);
  const totalVerified = headcountRows.reduce((a, h) => a + (h.verified_headcount ?? 0), 0);

  let lateArrivals: Array<{
    employee_id: string;
    name: string;
    department: string;
    shift: string;
    scheduled: string;
    firstIn: string;
    lateBy: number;
  }> = [];

  if (profile.role === "hr_admin" || profile.role === "hr_officer") {
    const { data: biometricRows } = await supabase
      .from("biometric_records")
      .select("first_in, employee:employees!biometric_records_employee_id_fkey(employee_id,name,department:departments!employees_department_id_fkey(name),shift:shifts!employees_shift_id_fkey(name,start_time))")
      .eq("work_date", today)
      .eq("is_unknown", false)
      .eq("is_duplicate", false)
      .not("first_in", "is", null);

    const rows = (biometricRows ?? []) as Array<{
      first_in: string | null;
      employee: {
        employee_id: string;
        name: string;
        department: { name: string } | null;
        shift: { name: string; start_time: string } | null;
      } | null;
    }>;

    const arrivals = rows.flatMap((row) => {
      const employee = row.employee;
      if (!employee || !row.first_in || !employee.shift?.start_time) return [];
      const firstInMinutes = timeToMinutes(row.first_in);
      const shiftStartMinutes = timeToMinutes(employee.shift.start_time);
      if (firstInMinutes === null || shiftStartMinutes === null || firstInMinutes <= shiftStartMinutes) return [];
      return [{
        employee_id: employee.employee_id,
        name: employee.name,
        department: employee.department?.name ?? "—",
        shift: employee.shift.name,
        scheduled: employee.shift.start_time.slice(0, 5),
        firstIn: row.first_in.slice(0, 5),
        lateBy: firstInMinutes - shiftStartMinutes,
      }];
    });
    const earliestByEmployee = new Map<string, typeof arrivals[number]>();
    for (const arrival of arrivals) {
      const existing = earliestByEmployee.get(arrival.employee_id);
      if (!existing || arrival.firstIn < existing.firstIn) earliestByEmployee.set(arrival.employee_id, arrival);
    }
    lateArrivals = Array.from(earliestByEmployee.values()).sort((a, b) => b.lateBy - a.lateBy);
  }

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
            {headcountRows.map((h, i) => (
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
      {(profile.role === "hr_admin" || profile.role === "hr_officer") && (
        <div className="card overflow-x-auto">
          <h2 className="font-medium mb-1">Late arrivals</h2>
          <p className="text-xs text-slate-500 mb-3">
            Employees whose biometric first-in is later than their assigned shift start.
          </p>
          <table className="table-base">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Shift start</th>
                <th>First-in</th>
                <th>Late by</th>
              </tr>
            </thead>
            <tbody>
              {lateArrivals.map((row) => (
                <tr key={row.employee_id}>
                  <td>{row.employee_id}</td>
                  <td>{row.name}</td>
                  <td>{row.department}</td>
                  <td>{row.shift}</td>
                  <td>{row.scheduled}</td>
                  <td>{row.firstIn}</td>
                  <td>{row.lateBy} min</td>
                </tr>
              ))}
              {lateArrivals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-6">
                    No late arrivals found. Confirm today’s biometric upload and employee shift assignments if you expected results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function timeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={"text-2xl font-semibold " + (color ?? "")}>{value}</p>
    </div>
  );
}
