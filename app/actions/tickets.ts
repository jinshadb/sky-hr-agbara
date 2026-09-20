"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/**
 * Generates one canteen ticket per department+shift for the given date and
 * meal, straight from approved_attendance — HR never re-enters who is
 * eligible. Only employees with status present/half_day, canteen_eligible,
 * whose attendance for that date is already approved, are included.
 */
export async function generateTickets(workDate: string, mealType: "breakfast" | "lunch" | "dinner" | "snacks") {
  const profile = await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();

  const { data: approved, error } = await supabase
    .from("approved_attendance")
    .select("employee_id, department_id, shift_id, status, employees(canteen_eligible)")
    .eq("work_date", workDate)
    .in("status", ["present", "half_day"]);
  if (error) return { error: error.message };

  type Group = { department_id: string; shift_id: string; employeeIds: string[] };
  const groups = new Map<string, Group>();
  for (const row of approved ?? []) {
    const eligible = (row as any).employees?.canteen_eligible;
    if (!eligible || !row.department_id || !row.shift_id) continue;
    const key = `${row.department_id}|${row.shift_id}`;
    const g = groups.get(key) ?? { department_id: row.department_id, shift_id: row.shift_id, employeeIds: [] };
    g.employeeIds.push(row.employee_id);
    groups.set(key, g);
  }

  if (groups.size === 0) return { error: "No approved, canteen-eligible attendance found for this date. Approve headcount first." };

  const created: string[] = [];
  for (const g of Array.from(groups.values())) {
    const ticketNumber = `CT-${workDate.replace(/-/g, "")}-${g.department_id.slice(0, 4)}-${mealType.slice(0, 1).toUpperCase()}`;

    const { data: existing } = await supabase
      .from("canteen_tickets")
      .select("id")
      .eq("work_date", workDate)
      .eq("department_id", g.department_id)
      .eq("shift_id", g.shift_id)
      .eq("meal_type", mealType)
      .maybeSingle();
    if (existing) continue; // already generated for this scope

    const { data: ticket, error: ticketErr } = await supabase
      .from("canteen_tickets")
      .insert({
        ticket_number: ticketNumber,
        work_date: workDate,
        department_id: g.department_id,
        shift_id: g.shift_id,
        meal_type: mealType,
        authorized_headcount: g.employeeIds.length,
        approved_by: profile.id,
        qr_code_data: ticketNumber,
        status: "active",
      })
      .select()
      .single();
    if (ticketErr || !ticket) continue;

    const eligibleRows = g.employeeIds.map((employee_id) => ({ ticket_id: ticket.id, employee_id }));
    for (let i = 0; i < eligibleRows.length; i += 500) {
      await supabase.from("ticket_eligible_employees").insert(eligibleRows.slice(i, i + 500));
    }
    created.push(ticket.ticket_number);
  }

  revalidatePath("/tickets");
  return { error: null, created };
}

export async function closeTicket(ticketId: string) {
  await requireProfile(["hr_admin", "hr_officer", "canteen_user"]);
  const supabase = createClient();
  const { error } = await supabase.from("canteen_tickets").update({ status: "closed" }).eq("id", ticketId);
  if (error) return { error: error.message };
  revalidatePath("/tickets");
  revalidatePath("/canteen/scan");
  revalidatePath("/reconciliation");
  return { error: null };
}
