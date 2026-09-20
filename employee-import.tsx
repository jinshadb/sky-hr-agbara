"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { bulkImportEmployees } from "@/app/actions/employees";

export default function EmployeeImport() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    let rows: any[] = [];
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data as any[];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    startTransition(async () => {
      const res = await bulkImportEmployees(rows);
      setResult(
        `Imported ${res.inserted}/${res.total}.` +
          (res.errors.length ? ` ${res.errors.length} issue(s): ${res.errors.slice(0, 5).join("; ")}` : "")
      );
    });
    e.target.value = "";
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
