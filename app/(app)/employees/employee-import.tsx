"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { bulkImportEmployees } from "@/app/actions/employees";

type ImportRow = {
  employee_id: string;
  biometric_id: string;
  name: string;
  department: string;
  designation: string;
  employment_type: "company" | "contract" | "trial";
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function readEmployeeRows(rawRows: unknown[][]): ImportRow[] {
  const headerIndex = rawRows.findIndex((row) =>
    row.some((cell) => ["employee id", "emp id"].includes(normalizeHeader(cell)))
  );
  if (headerIndex < 0) {
    throw new Error("Could not find an Employee ID header. Check that the file has a header row.");
  }

  const headers = rawRows[headerIndex].map(normalizeHeader);
  const findColumn = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const idColumn = findColumn(["employee id", "emp id"]);
  const nameColumn = findColumn(["name", "employee name", "first name", "full name"]);
  const departmentColumn = findColumn(["department", "department name"]);
  const designationColumn = findColumn(["designation", "position", "job title"]);
  const typeColumn = findColumn(["employment type", "employment category", "worker type"]);
  if (idColumn < 0 || nameColumn < 0) {
    throw new Error("The file must contain Employee ID and Name columns.");
  }

  const cell = (row: unknown[], index: number) => index < 0 ? "" : String(row[index] ?? "").trim();
  return rawRows.slice(headerIndex + 1).flatMap((row) => {
    const employeeId = cell(row, idColumn);
    const name = cell(row, nameColumn);
    if (!employeeId && !name) return [];
    const sourceType = cell(row, typeColumn).toLowerCase();
    const employmentType = sourceType === ""
      ? (typeColumn >= 0 ? "trial" : "company")
      : sourceType.includes("trial") || sourceType.includes("enrol") || sourceType.includes("trainee")
        ? "trial"
        : sourceType.includes("contract") || sourceType.includes("casual") || sourceType.includes("temporary") || sourceType === "temp"
          ? "contract"
          : "company";

    return [{
      employee_id: employeeId,
      biometric_id: employeeId,
      name,
      department: cell(row, departmentColumn),
      designation: cell(row, designationColumn),
      employment_type: employmentType,
    }];
  });
}

export default function EmployeeImport() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult("Reading file…");

    try {
      let rawRows: unknown[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const parsed = Papa.parse<unknown[]>(await file.text(), { header: false, skipEmptyLines: true });
        rawRows = parsed.data;
      } else {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
      }

      const rows = readEmployeeRows(rawRows);
      if (rows.length === 0) throw new Error("No employee rows were found below the header.");
      setResult(`Found ${rows.length} employee rows. Importing…`);

      startTransition(async () => {
        try {
          const res = await bulkImportEmployees(rows);
          const warningText = res.warnings.length ? ` ${res.warnings.length} department label(s) need setup: ${res.warnings.slice(0, 3).join("; ")}` : "";
          const errorText = res.errors.length ? ` ${res.errors.length} issue(s): ${res.errors.slice(0, 3).join("; ")}` : "";
          setResult(`Imported ${res.inserted}/${res.total}.${warningText}${errorText}`);
        } catch (error) {
          setResult(`Import failed: ${error instanceof Error ? error.message : "Please check the file and try again."}`);
        }
      });
    } catch (error) {
      setResult(`File could not be read: ${error instanceof Error ? error.message : "Please check the file format."}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
        disabled={pending}
        className="text-sm"
      />
      {pending && <p className="text-sm text-slate-500 mt-2">Importing…</p>}
      {result && <p className="text-sm text-slate-600 mt-2">{result}</p>}
    </div>
  );
}
