"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type BiometricRow = {
  biometric_id: string;
  name?: string;
  work_date: string; // ISO yyyy-mm-dd
  first_in?: string | null;
  last_out?: string | null;
  hours_worked?: number | null;
};

const PRESENT_HOURS_THRESHOLD = 4; // >= this many hours = present, else half_day

/**
 * The single ingestion point for biometric exports. Parses rows the client
 * already extracted from the Excel/CSV, matches employees, detects
 * duplicates/unknowns, computes daily_attendance, and rolls that up into
 * daily_headcount (biometric side only — HR still verifies before approval).
 * Nothing here requires HR to re-key any attendance data.
 */
export async function processBiometricUpload(fileName: string, rows: BiometricRow[]) {
  const profile = await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();

  const { data: upload, error: uploadErr } = await supabase
    .from("biometric_uploads")
    .insert({
      file_name: fileName,
      uploaded_by: profile.id,
      total_rows: rows.length,
      status: "processing",
    })
    .select()
    .single();
  if (uploadErr || !upload) return { error: uploadErr?.message ?? "Could not create upload" };

  const { data: employees } = await supabase
    .from("employees")
    .select("id, biometric_id, department_id, shift_id")
    .not("biometric_id", "is", null);
  const byBiometricId = new Map((employees ?? []).map((e) => [String(e.biometric_id), e]));

  const seen = new Set<string>(); // `${biometric_id}|${work_date}` within this upload
  let matched = 0;
  let unmatched = 0;
  let duplicates = 0;

  const recordsToInsert: any[] = [];
  // employee_id -> work_date -> best row (for daily_attendance rollup)
  const attendanceMap = new Map<string, { employee: any; work_date: string; hours: number }>();

  for (const row of rows) {
    const key = `${row.biometric_id}|${row.work_date}`;
    const isDuplicate = seen.has(key);
    seen.add(key);

    const employee = byBiometricId.get(String(row.biometric_id));
    const isUnknown = !employee;

    if (isUnknown) unmatched++;
    else if (isDuplicate) duplicates++;
    else matched++;

    const hours =
      row.hours_worked ??
      computeHours(row.first_in ?? null, row.last_out ?? null) ??
      0;

    recordsToInsert.push({
      upload_id: upload.id,
      biometric_id_raw: row.biometric_id,
      name_raw: row.name ?? null,
      employee_id: employee?.id ?? null,
      work_date: row.work_date,
      first_in: row.first_in || null,
      last_out: row.last_out || null,
      hours_worked: hours,
      is_duplicate: isDuplicate,
      is_unknown: isUnknown,
      exception_flags:
        isUnknown || isDuplicate
          ? { unknown: isUnknown, duplicate: isDuplicate }
          : {},
    });

    if (employee && !isDuplicate) {
      const mapKey = `${employee.id}|${row.work_date}`;
      const existing = attendanceMap.get(mapKey);
      if (!existing || hours > existing.hours) {
        attendanceMap.set(mapKey, { employee, work_date: row.work_date, hours });
      }
    }
  }

  // insert in chunks to stay under payload limits
  for (let i = 0; i < recordsToInsert.length; i += 500) {
    const chunk = recordsToInsert.slice(i, i + 500);
    const { error } = await supabase.from("biometric_records").insert(chunk);
    if (error) {
      await supabase.from("biometric_uploads").update({ status: "failed" }).eq("id", upload.id);
      return { error: error.message };
    }
  }

  const attendanceRows = Array.from(attendanceMap.values()).map((a) => ({
    employee_id: a.employee.id,
    work_date: a.work_date,
    department_id: a.employee.department_id,
    shift_id: a.employee.shift_id,
    biometric_status: (a.hours >= PRESENT_HOURS_THRESHOLD ? "present" : "half_day") as "present" | "half_day",
    hours_worked: a.hours,
    source_upload_id: upload.id,
  }));

  for (let i = 0; i < attendanceRows.length; i += 500) {
    const chunk = attendanceRows.slice(i, i + 500);
    const { error } = await supabase
      .from("daily_attendance")
      .upsert(chunk, { onConflict: "employee_id,work_date" });
    if (error) return { error: error.message };
  }

  // Roll up into daily_headcount per work_date/department/shift
  const headcountMap = new Map<string, { work_date: string; department_id: string; shift_id: string; count: number }>();
  for (const a of attendanceRows) {
    if (!a.department_id || !a.shift_id) continue;
    const key = `${a.work_date}|${a.department_id}|${a.shift_id}`;
    const cur = headcountMap.get(key);
    if (cur) cur.count++;
    else headcountMap.set(key, { work_date: a.work_date, department_id: a.department_id, shift_id: a.shift_id, count: 1 });
  }

  for (const hc of Array.from(headcountMap.values())) {
    // Upsert biometric_headcount without clobbering an already-verified/approved row
    const { data: existingRow } = await supabase
      .from("daily_headcount")
      .select("id, status")
      .eq("work_date", hc.work_date)
      .eq("department_id", hc.department_id)
      .eq("shift_id", hc.shift_id)
      .maybeSingle();

    if (existingRow) {
      if (existingRow.status !== "approved") {
        await supabase
          .from("daily_headcount")
          .update({ biometric_headcount: hc.count })
          .eq("id", existingRow.id);
      }
    } else {
      await supabase.from("daily_headcount").insert({
        work_date: hc.work_date,
        department_id: hc.department_id,
        shift_id: hc.shift_id,
        biometric_headcount: hc.count,
      });
    }
  }

  await supabase
    .from("biometric_uploads")
    .update({
      status: "completed",
      matched_rows: matched,
      unmatched_rows: unmatched,
      duplicate_rows: duplicates,
    })
    .eq("id", upload.id);

  revalidatePath("/biometric/upload");
  revalidatePath("/headcount");
  revalidatePath("/dashboard");

  return {
    error: null,
    summary: { total: rows.length, matched, unmatched, duplicates, uploadId: upload.id },
  };
}

function computeHours(firstIn: string | null, lastOut: string | null): number | null {
  if (!firstIn || !lastOut) return null;
  const [ih, im] = firstIn.split(":").map(Number);
  const [oh, om] = lastOut.split(":").map(Number);
  let minutes = oh * 60 + om - (ih * 60 + im);
  if (minutes < 0) minutes += 24 * 60; // overnight shift
  return Math.round((minutes / 60) * 100) / 100;
}
