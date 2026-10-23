"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { processBiometricUpload, type BiometricRow } from "@/app/actions/biometric";

// Accept common device exports, including Sky's Employee ID / First Name report.
const COLUMN_ALIASES: Record<string, string[]> = {
  biometric_id: ["biometric_id", "biometric id", "emp code", "employee id", "employee no", "employee number", "id", "device id", "card no"],
  name: ["name", "employee name", "first name"],
  work_date: ["date", "work_date", "attendance date"],
  first_in: ["in", "in time", "first in", "first punch", "check in", "punch in"],
  last_out: ["out", "out time", "last out", "last punch", "check out", "punch out"],
  hours_worked: ["hours", "hours worked", "total hours", "total time", "duration"],
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeaderIndex(matrix: any[][]): number {
  return matrix.findIndex((row) => {
    const keys = row.map((cell) => normalizeKey(String(cell ?? "")));
    return (
      keys.some((key) => COLUMN_ALIASES.biometric_id.includes(key)) &&
      keys.some((key) => COLUMN_ALIASES.work_date.includes(key))
    );
  });
}

function recordsFromMatrix(matrix: any[][]): Record<string, any>[] {
  const headerIndex = findHeaderIndex(matrix);
  if (headerIndex < 0) return [];

  const headers = matrix[headerIndex].map((cell) => String(cell ?? "").trim());
  return matrix.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell !== "" && cell != null))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function mapRow(raw: Record<string, any>): BiometricRow | null {
  const lower: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) lower[normalizeKey(k)] = v;

  function find(field: string) {
    for (const alias of COLUMN_ALIASES[field]) {
      if (lower[alias] !== undefined && lower[alias] !== "") return lower[alias];
    }
    return undefined;
  }

  const biometric_id = find("biometric_id");
  const dateRaw = find("work_date");
  if (!biometric_id || !dateRaw) return null;

  const work_date = toIsoDate(dateRaw);
  if (!work_date) return null;

  return {
    biometric_id: String(biometric_id).trim(),
    name: find("name") ? String(find("name")).trim() : undefined,
    work_date,
    first_in: find("first_in") ? String(find("first_in")).trim() : null,
    last_out: find("last_out") ? String(find("last_out")).trim() : null,
    hours_worked: toHours(find("hours_worked")),
  };
}

function toHours(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    const hours = value >= 0 && value <= 1 ? value * 24 : value;
    return Number.isFinite(hours) ? Math.round(hours * 100) / 100 : null;
  }
  const text = String(value).trim();
  const duration = text.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
  if (duration) {
    const hours = Number(duration[1]) + Number(duration[2]) / 60 + Number(duration[3] ?? 0) / 3600;
    return Math.round(hours * 100) / 100;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function toIsoDate(value: any): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(value).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export default function UploadForm() {
  const [rows, setRows] = useState<BiometricRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setParseWarning(null);
    setFileName(file.name);

    let matrix: any[][] = [];
    if (file.name.toLowerCase().endsWith(".csv")) {
      const text = await file.text();
      matrix = Papa.parse(text, { header: false, skipEmptyLines: true }).data as any[][];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
    }

    const headerIndex = findHeaderIndex(matrix);
    if (headerIndex < 0) {
      setRows([]);
      setSkipped(0);
      setParseWarning("Could not find a header row containing an Employee/Biometric ID and Date.");
      return;
    }

    const mapped: BiometricRow[] = [];
    let skip = 0;
    for (const record of recordsFromMatrix(matrix)) {
      const row = mapRow(record);
      if (row) mapped.push(row);
      else skip++;
    }
    setRows(mapped);
    setSkipped(skip);
  }

  function commit() {
    if (!rows?.length) return;
    startTransition(async () => {
      const res = await processBiometricUpload(fileName, rows);
      if (res.error) {
        setResult(`Error: ${res.error}`);
        return;
      }
      const s = res.summary!;
      setResult(
        `Processed ${s.total} rows — ${s.matched} matched, ${s.unmatched} unknown employee(s), ${s.duplicates} duplicate(s).`
      );
      setRows(null);
    });
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="text-sm" />

      {parseWarning && <p className="text-sm text-amber-700">{parseWarning}</p>}

      {rows && (
        <div className="space-y-2">
          <p className="text-sm">
            Preview: <b>{rows.length}</b> readable row(s)
            {skipped > 0 && <span className="text-amber-600"> · {skipped} row(s) could not be read (missing ID or date)</span>}
          </p>
          <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Biometric ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td>{r.biometric_id}</td>
                    <td>{r.name ?? "—"}</td>
                    <td>{r.work_date}</td>
                    <td>{r.first_in ?? "—"}</td>
                    <td>{r.last_out ?? "—"}</td>
                    <td>{r.hours_worked ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-primary" onClick={commit} disabled={pending || rows.length === 0}>
            {pending ? "Processing…" : `Confirm & process ${rows.length} rows`}
          </button>
        </div>
      )}

      {result && <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{result}</p>}
    </div>
  );
}
