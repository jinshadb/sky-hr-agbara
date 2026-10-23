"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type EmploymentType = "company" | "contract" | "trial";

export type EmployeeInput = {
  employee_id: string;
  biometric_id?: string | null;
  name: string;
  department_id?: string | null;
  department?: string | null;
  section?: string | null;
  designation?: string | null;
  shift_id?: string | null;
  payroll_id?: string | null;
  status?: "active" | "inactive";
  employment_type?: EmploymentType;
  canteen_eligible?: boolean;
};

function canonicalDepartment(value: string): string {
  const name = value.trim();
  if (/^maintenance\b/i.test(name)) return "Maintenance";
  if (/^quality(\s+control)?\b/i.test(name)) return "Quality";
  if (/^warehouse(\/stores)?\b/i.test(name)) return "Warehouse";
  return name;
}

function employmentType(value?: string | null): EmploymentType {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "trial" || normalized.includes("enrol") || normalized.includes("trainee")) return "trial";
  if (normalized === "contract" || normalized === "casual" || normalized.includes("temporary") || normalized === "temp" || normalized === "contract staff") return "contract";
  return "company";
}

export async function upsertEmployee(input: EmployeeInput) {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .upsert(
      {
        employee_id: input.employee_id,
        biometric_id: input.biometric_id || null,
        name: input.name,
        department_id: input.department_id || null,
        section: input.section || null,
        designation: input.designation || null,
        shift_id: input.shift_id || null,
        payroll_id: input.payroll_id || null,
        status: input.status || "active",
        employment_type: input.employment_type || "company",
        canteen_eligible: input.canteen_eligible ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" }
    );
  if (error) return { error: error.message };
  revalidatePath("/employees");
  return { error: null };
}

export async function bulkImportEmployees(rows: EmployeeInput[]) {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { data: departments, error: departmentError } = await supabase.from("departments").select("id, name");
  if (departmentError) {
    return { inserted: 0, total: rows.length, errors: [departmentError.message], warnings: [] as string[] };
  }

  const departmentIds = new Map((departments ?? []).map((department) => [department.name.trim().toLowerCase(), department.id]));
  let inserted = 0;
  const errors: string[] = [];
  const unmappedDepartments = new Set<string>();

  for (const row of rows) {
    const employeeId = String(row.employee_id ?? "").trim();
    const employeeName = String(row.name ?? "").trim();
    if (!employeeId || !employeeName) {
      errors.push("Skipped a row missing Employee ID or name.");
      continue;
    }

    const sourceDepartment = String(row.department ?? "").trim();
    const canonicalName = sourceDepartment ? canonicalDepartment(sourceDepartment) : "";
    const mappedDepartmentId = row.department_id || departmentIds.get(canonicalName.toLowerCase()) || null;
    const sectionFromSource = sourceDepartment && !mappedDepartmentId
      ? sourceDepartment
      : sourceDepartment && canonicalName !== sourceDepartment
        ? sourceDepartment.replace(canonicalName, "").trim()
        : null;
    if (sourceDepartment && !mappedDepartmentId) unmappedDepartments.add(sourceDepartment);

    const { error } = await supabase.from("employees").upsert(
      {
        employee_id: employeeId,
        biometric_id: String(row.biometric_id ?? "").trim() || employeeId,
        name: employeeName,
        department_id: mappedDepartmentId,
        section: String(row.section ?? "").trim() || sectionFromSource || null,
        designation: String(row.designation ?? "").trim() || null,
        payroll_id: String(row.payroll_id ?? "").trim() || null,
        status: row.status === "inactive" ? "inactive" : "active",
        employment_type: employmentType(row.employment_type),
        canteen_eligible: row.canteen_eligible ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" }
    );
    if (error) errors.push(`${employeeId}: ${error.message}`);
    else inserted++;
  }

  revalidatePath("/employees");
  const warnings = Array.from(unmappedDepartments).map(
    (name) => `Department "${name}" was kept in Section because it is not configured in Departments.`
  );
  return { inserted, total: rows.length, errors, warnings };
}

export async function bulkAssignEmployees(
  employeeIds: string[],
  updateDepartment: boolean,
  departmentId: string,
  updateShift: boolean,
  shiftId: string
) {
  await requireProfile(["hr_admin", "hr_officer"]);
  const ids = Array.from(new Set(employeeIds.map((id) => String(id).trim()).filter(Boolean)));
  if (ids.length === 0) return { error: "Select at least one employee.", updated: 0 };
  if (ids.length > 1000) return { error: "Select no more than 1,000 employees at a time.", updated: 0 };
  if (!updateDepartment && !updateShift) {
    return { error: "Choose whether to update department, shift, or both.", updated: 0 };
  }

  const supabase = createClient();
  const values: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (updateDepartment) {
    if (!departmentId) return { error: "Choose a department.", updated: 0 };
    values.department_id = departmentId;
  }
  if (updateShift) {
    if (!shiftId) return { error: "Choose a shift.", updated: 0 };
    values.shift_id = shiftId;
  }

  const { data, error } = await supabase
    .from("employees")
    .update(values)
    .in("id", ids)
    .select("id");
  if (error) return { error: error.message, updated: 0 };

  revalidatePath("/employees");
  revalidatePath("/biometric/upload");
  return { error: null, updated: data?.length ?? 0 };
}

export async function setEmployeeStatus(employeeId: string, status: "active" | "inactive") {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { error } = await supabase.from("employees").update({ status }).eq("id", employeeId);
  if (error) return { error: error.message };
  revalidatePath("/employees");
  return { error: null };
}
