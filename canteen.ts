"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/**
 * Marks a meal served for one employee against one ticket. Accepts either a
 * typed Employee ID (manual search) or a scanned QR value that encodes the
 * Employee ID. Double-claims are rejected both here and by the database's
 * unique(ticket_id, employee_id) constraint, so this is safe even if the
 * same person is scanned twice from two devices at once.
 */
export async function serveMeal(ticketId: string, employeeIdOrQr: string, method: "qr" | "manual_search") {
  const profile = await requireProfile(["hr_admin", "canteen_user"]);
  const supabase = createClient();

  const rawId = employeeIdOrQr.trim();

  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_id, name, canteen_eligible")
    .eq("employee_id", rawId)
    .maybeSingle();
  if (empErr) return { error: empErr.message };
  if (!employee) return { error: `No employee found with ID "${rawId}".` };

  const { data: eligible } = await supabase
    .from("ticket_eligible_employees")
    .select("employee_id")
    .eq("ticket_id", ticketId)
    .eq("employee_id", employee.id)
    .maybeSingle();
  if (!eligible) return { error: `${employee.name} (${employee.employee_id}) is not on this ticket's eligible list.` };

  const { data: alreadyServed } = await supabase
    .from("meal_records")
    .select("id, served_at")
    .eq("ticket_id", ticketId)
    .eq("employee_id", employee.id)
    .maybeSingle();
  if (alreadyServed) {
    return { error: `Already served to ${employee.name} at ${new Date(alreadyServed.served_at).toLocaleTimeString()}.` };
  }

  const { error } = await supabase.from("meal_records").insert({
    ticket_id: ticketId,
    employee_id: employee.id,
    served_by: profile.id,
    method,
  });
  if (error) {
    if (error.code === "23505") return { error: `Already served to ${employee.name}.` };
    return { error: error.message };
  }

  revalidatePath("/canteen/scan");
  revalidatePath("/reconciliation");
  return { error: null, employeeName: employee.name, employeeId: employee.employee_id };
}
