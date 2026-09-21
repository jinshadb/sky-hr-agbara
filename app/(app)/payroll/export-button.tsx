"use client";

import * as XLSX from "xlsx";

type DayRecord = {
  date: string;
  first_in: string | null;
  last_out: string | null;
  hours: number | null;
  status: string;
};

type AttendanceRow = {
  employee_id: string;
  name: string;
  employment_type: string;
  department: string;
  total_hours: number;
  days: Record<string, DayRecord>;
};

export default function ExportButton({
  rows,
  dates,
  month,
  year,
}: {
  rows: AttendanceRow[];
  dates: string[];
  month: number;
  year: number;
}) {
  function exportWorkbook() {
    const matrix = rows.map((row) => {
      const result: Record<string, string | number> = {
        "Employee ID": row.employee_id,
        Name: row.name,
        Type: row.employment_type === "contract" ? "Contract" : "Company",
        Department: row.department,
      };
      for (const date of dates) {
        const day = row.days[date];
        result[`Day ${Number(date.slice(-2))}`] = day
          ? `${day.first_in?.slice(0, 5) ?? "—"} | ${day.last_out?.slice(0, 5) ?? "—"} | ${day.hours == null ? "—" : day.hours.toFixed(2) + "h"} | ${day.status}`
          : "";
      }
      result["Total Hours"] = Number(row.total_hours.toFixed(2));
      return result;
    });

    const detail = rows.flatMap((row) =>
      dates.map((date) => {
        const day = row.days[date];
        return {
          "Employee ID": row.employee_id,
          Name: row.name,
          Type: row.employment_type === "contract" ? "Contract" : "Company",
          Department: row.department,
          Date: date,
          Day: Number(date.slice(-2)),
          "IN Time": day?.first_in?.slice(0, 5) ?? "",
          "OUT Time": day?.last_out?.slice(0, 5) ?? "",
          "Hours Worked": day?.hours == null ? "" : Number(day.hours.toFixed(2)),
          Status: day?.status ?? "",
        };
      })
    );

    const workbook = XLSX.utils.book_new();
    const matrixSheet = XLSX.utils.json_to_sheet(matrix);
    const detailSheet = XLSX.utils.json_to_sheet(detail);
    matrixSheet["!cols"] = [
      { wch: 14 },
      { wch: 26 },
      { wch: 12 },
      { wch: 20 },
      ...dates.map(() => ({ wch: 28 })),
      { wch: 12 },
    ];
    detailSheet["!cols"] = [
      { wch: 14 },
      { wch: 26 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, matrixSheet, "Monthly Matrix");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Daily Detail");
    XLSX.writeFile(
      workbook,
      `final_attendance_${year}-${String(month).padStart(2, "0")}.xlsx`
    );
  }

  return (
    <button className="btn-primary" type="button" onClick={exportWorkbook}>
      Export Excel
    </button>
  );
}
