"use client";

import Papa from "papaparse";

export default function ExportButton({ rows, month, year }: { rows: any[]; month: number; year: number }) {
  function exportCsv() {
    const flat = rows.map((s) => ({
      employee_id: s.employees?.employee_id,
      name: s.employees?.name,
      department: s.employees?.departments?.name,
      present_days: s.present_days,
      absent_days: s.absent_days,
      leave_paid_days: s.leave_paid_days,
      leave_unpaid_days: s.leave_unpaid_days,
      half_days: s.half_days,
    }));
    const csv = Papa.unparse(flat);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `final_attendance_${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn-secondary" onClick={exportCsv}>
      Export CSV
    </button>
  );
}
