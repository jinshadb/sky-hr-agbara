"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function saveVerification(headcountId: string, verifiedHeadcount: number, reason: string) {
  const profile = await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_headcount")
    .update({
      verified_headcount: verifiedHeadcount,
      reason,
      verified_by: profile.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", headcountId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/headcount");
  return { error: null };
}

export async function addCorrection(
  headcountId: string,
  employeeId: string,
  correctionType: "add_present" | "mark_absent" | "mark_leave",
  reason: string
) {
  const profile = await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { error } = await supabase.from("headcount_corrections").insert({
    headcount_id: headcountId,
    employee_id: employeeId,
    correction_type: correctionType,
    reason,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/headcount");
  return { error: null };
}

/**
 * Approves a department/shift/date headcount row. This is the single
 * moment attendance becomes official: it locks in approved_attendance for
 * every active employee expected in that department+shift that day, using
 * daily_attendance (biometric) as the base and headcount_corrections as
 * overrides. Downstream (canteen tickets, payroll) reads only from
 * approved_attendance from this point on.
 */
export async function approveHeadcount(headcountId: string) {
  const profile = await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();

  const { data: hc, error: hcErr } = await supabase
    .from("daily_headcount")
    .select("*")
    .eq("id", headcountId)
    .single();
  if (hcErr || !hc) return { error: hcErr?.message ?? "Headcount row not found" };
  if (hc.verified_headcount === null || hc.verified_headcount === undefined) {
    return { error: "Enter and save the verified headcount before approving." };
  }
  if (hc.status === "approved") return { error: "Already approved." };

  const { data: employees } = await supabase
    .from("employees")
    .select("id, department_id, shift_id")
    .eq("department_id", hc.department_id)
    .eq("shift_id", hc.shift_id)
    .eq("status", "active");

  const { data: attendance } = await supabase
    .from("daily_attendance")
    .select("employee_id, biometric_status, hours_worked")
    .eq("work_date", hc.work_date)
    .eq("department_id", hc.department_id)
    .eq("shift_id", hc.shift_id);
  const attendanceByEmployee = new Map((attendance ?? []).map((a) => [a.employee_id, a]));

  const { data: corrections } = await supabase
    .from("headcount_corrections")
    .select("employee_id, correction_type")
    .eq("headcount_id", headcountId);
  const correctionByEmployee = new Map((corrections ?? []).map((c) => [c.employee_id, c.correction_type]));

  const rows = (employees ?? []).map((emp) => {
    const att = attendanceByEmployee.get(emp.id);
    const correction = correctionByEmployee.get(emp.id);

    let status: "present" | "absent" | "leave" | "half_day" = att
      ? (att.biometric_status as any)
      : "absent";
    let hours = att?.hours_worked ?? 0;

    if (correction === "add_present") status = "present";
    if (correction === "mark_absent") {
      status = "absent";
      hours = 0;
    }
    if (correction === "mark_leave") {
      status = "leave";
      hours = 0;
    }

    return {
      employee_id: emp.id,
      work_date: hc.work_date,
      department_id: hc.department_id,
      shift_id: hc.shift_id,
      status,
      hours_worked: hours,
      ot_hours: 0,
      locked: true,
      headcount_id: hc.id,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("approved_attendance")
      .upsert(chunk, { onConflict: "employee_id,work_date" });
    if (error) return { error: error.message };
  }

  const { error: approveErr } = await supabase
    .from("daily_headcount")
    .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", headcountId);
  if (approveErr) return { error: approveErr.message };

  revalidatePath("/headcount");
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { error: null, approvedCount: rows.length };
}
