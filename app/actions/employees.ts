"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type EmployeeInput = {
  employee_id: string;
  biometric_id?: string | null;
  name: string;
  department_id?: string | null;
  section?: string | null;
  designation?: string | null;
  shift_id?: string | null;
  payroll_id?: string | null;
  status?: "active" | "inactive";
  employment_type?: "company" | "contract";
  canteen_eligible?: boolean;
};

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
  let inserted = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.employee_id || !row.name) {
      errors.push(`Skipped row missing employee_id/name: ${JSON.stringify(row)}`);
      continue;
    }
    const { error } = await supabase.from("employees").upsert(
      {
        employee_id: String(row.employee_id).trim(),
        biometric_id: row.biometric_id ? String(row.biometric_id).trim() : null,
        name: String(row.name).trim(),
        section: row.section || null,
        designation: row.designation || null,
        payroll_id: row.payroll_id || null,
        status: (row.status as "active" | "inactive") || "active",
        employment_type: row.employment_type === "contract" ? "contract" : "company",
        canteen_eligible:
          row.canteen_eligible === undefined ? true : Boolean(row.canteen_eligible),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" }
    );
    if (error) errors.push(`${row.employee_id}: ${error.message}`);
    else inserted++;
  }

  revalidatePath("/employees");
  return { inserted, total: rows.length, errors };
}

export async function setEmployeeStatus(employeeId: string, status: "active" | "inactive") {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { error } = await supabase.from("employees").update({ status }).eq("id", employeeId);
  if (error) return { error: error.message };
  revalidatePath("/employees");
  return { error: null };
}
