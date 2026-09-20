import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import EmployeeImport from "./employee-import";
import EmployeeForm from "./employee-form";
import StatusToggle from "./status-toggle";

export default async function EmployeesPage() {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();

  const [{ data: employees }, { data: departments }, { data: shifts }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, employee_id, biometric_id, name, section, designation, employment_type, status, canteen_eligible, department_id, shift_id, departments(name), shifts(name)")
      .order("employee_id"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("shifts").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Employee Master</h1>
        <p className="text-sm text-slate-500">
          The single source of truth for every employee. Employee ID is the key used
          throughout attendance, canteen and payroll — no re-entry downstream.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-medium mb-2">Add / edit employee</h2>
          <EmployeeForm departments={departments ?? []} shifts={shifts ?? []} />
        </div>
        <div className="card">
          <h2 className="font-medium mb-2">Bulk import (CSV / Excel)</h2>
          <p className="text-sm text-slate-500 mb-2">
            Columns: employee_id, biometric_id, name, employment_type, section, designation,
            payroll_id, status, canteen_eligible. Employment type must be company or contract.
          </p>
          <EmployeeImport />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Biometric ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Designation</th>
              <th>Canteen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((e: any) => (
              <tr key={e.id}>
                <td className="font-medium">{e.employee_id}</td>
                <td>{e.biometric_id ?? "—"}</td>
                <td>{e.name}</td>
                <td className="capitalize">{e.employment_type === "contract" ? "Contract" : "Company"}</td>
                <td>{e.departments?.name ?? "—"}</td>
                <td>{e.shifts?.name ?? "—"}</td>
                <td>{e.designation ?? "—"}</td>
                <td>{e.canteen_eligible ? "Eligible" : "Not eligible"}</td>
                <td>
                  <StatusToggle employeeId={e.id} status={e.status} />
                </td>
              </tr>
            ))}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-6">
                  No employees yet — add one above or bulk import.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
