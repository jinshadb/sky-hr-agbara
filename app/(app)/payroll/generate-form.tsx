"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generatePayroll } from "@/app/actions/payroll";

export default function GeneratePayrollForm({ defaultMonth, defaultYear }: { defaultMonth: number; defaultYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await generatePayroll(month, year);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Generated for ${res.employeeCount} employee(s).`);
        router.push(`/payroll?month=${month}&year=${year}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-sm font-medium block mb-1">Month</label>
        <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Year</label>
        <input
          type="number"
          className="input w-24"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </div>
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate / refresh"}
      </button>
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </form>
  );
}
