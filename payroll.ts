"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/**
 * Computes the monthly payroll attendance summary entirely from
 * approved_attendance (+ leave_entries for paid/unpaid classification).
 * HR/payroll never re-key attendance for payroll — this reads the same
 * locked records that fed the canteen tickets.
 */
export async function generatePayroll(month: number, year: number) {
  const profile = await requireProfile(["hr_admin", "payroll_user"]);
  const supabase = createClient();

  const { data: period, error: periodErr } = await supabase
    .from("payroll_periods")
    .upsert(
      { period_month: month, period_year: year, status: "generated", generated_by: profile.id, generated_at: new Date().toISOString() },
      { onConflict: "period_month,period_year" }
    )
    .select()
    .single();
  if (periodErr || !period) return { error: periodErr?.message ?? "Could not create payroll period" };

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(year, month, 0); // last day of month
  const to = toDate.toISOString().slice(0, 10);

  const { data: attendance, error: attErr } = await supabase
    .from("approved_attendance")
    .select("employee_id, work_date, status, ot_hours")
    .gte("work_date", from)
    .lte("work_date", to);
  if (attErr) return { error: attErr.message };

  const { data: leave } = await supabase
    .from("leave_entries")
    .select("employee_id, date_from, date_to, leave_type")
    .eq("status", "approved")
    .lte("date_from", to)
    .gte("date_to", from);

  type Row = {
    present_days: number;
    absent_days: number;
    leave_paid_days: number;
    leave_unpaid_days: number;
    half_days: number;
    ot_hours: number;
  };
  const byEmployee = new Map<string, Row>();

  function get(employeeId: string): Row {
    let r = byEmployee.get(employeeId);
    if (!r) {
      r = { present_days: 0, absent_days: 0, leave_paid_days: 0, leave_unpaid_days: 0, half_days: 0, ot_hours: 0 };
      byEmployee.set(employeeId, r);
    }
    return r;
  }

  function leaveTypeFor(employeeId: string, date: string): "paid" | "unpaid" {
    const match = (leave ?? []).find(
      (l) => l.employee_id === employeeId && date >= l.date_from && date <= l.date_to
    );
    return (match?.leave_type as "paid" | "unpaid") ?? "unpaid";
  }

  for (const a of attendance ?? []) {
    const r = get(a.employee_id);
    r.ot_hours += Number(a.ot_hours ?? 0);
    if (a.status === "present") r.present_days += 1;
    else if (a.status === "half_day") {
      r.half_days += 1;
      r.present_days += 0.5;
    } else if (a.status === "absent") r.absent_days += 1;
    else if (a.status === "leave") {
      const type = leaveTypeFor(a.employee_id, a.work_date);
      if (type === "paid") r.leave_paid_days += 1;
      else r.leave_unpaid_days += 1;
    }
  }

  const rows = Array.from(byEmployee.entries()).map(([employee_id, r]) => {
    const unpaid_days = r.absent_days + r.leave_unpaid_days;
    const paid_days = r.present_days + r.leave_paid_days;
    return {
      payroll_period_id: period.id,
      employee_id,
      present_days: r.present_days,
      absent_days: r.absent_days,
      leave_paid_days: r.leave_paid_days,
      leave_unpaid_days: r.leave_unpaid_days,
      half_days: r.half_days,
      paid_days,
      unpaid_days,
      ot_hours: r.ot_hours,
      deduction_days: unpaid_days,
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from("payroll_attendance_summary")
      .upsert(rows.slice(i, i + 500), { onConflict: "payroll_period_id,employee_id" });
    if (error) return { error: error.message };
  }

  revalidatePath("/payroll");
  return { error: null, periodId: period.id, employeeCount: rows.length };
}
