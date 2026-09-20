"use client";

import { useState, useTransition } from "react";
import { upsertEmployee } from "@/app/actions/employees";

export default function EmployeeForm({
  departments,
  shifts,
}: {
  departments: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({
    employee_id: "",
    biometric_id: "",
    name: "",
    department_id: "",
    section: "",
    designation: "",
    shift_id: "",
    payroll_id: "",
    employment_type: "company" as "company" | "contract",
    canteen_eligible: true,
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertEmployee(form);
      setMessage(res.error ? `Error: ${res.error}` : "Saved.");
      if (!res.error) {
        setForm({
          employee_id: "",
          biometric_id: "",
          name: "",
          department_id: "",
          section: "",
          designation: "",
          shift_id: "",
          payroll_id: "",
          employment_type: "company",
          canteen_eligible: true,
        });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <input
        className="input col-span-1"
        placeholder="Employee ID *"
        value={form.employee_id}
        onChange={(e) => update("employee_id", e.target.value)}
        required
      />
      <input
        className="input col-span-1"
        placeholder="Biometric ID"
        value={form.biometric_id}
        onChange={(e) => update("biometric_id", e.target.value)}
      />
      <input
        className="input col-span-2"
        placeholder="Full name *"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        required
      />
      <select
        className="input"
        value={form.department_id}
        onChange={(e) => update("department_id", e.target.value)}
      >
        <option value="">Department</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={form.shift_id}
        onChange={(e) => update("shift_id", e.target.value)}
      >
        <option value="">Shift</option>
        {shifts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="Section"
        value={form.section}
        onChange={(e) => update("section", e.target.value)}
      />
      <input
        className="input"
        placeholder="Designation"
        value={form.designation}
        onChange={(e) => update("designation", e.target.value)}
      />
      <input
        className="input"
        placeholder="Payroll ID"
        value={form.payroll_id}
        onChange={(e) => update("payroll_id", e.target.value)}
      />
      <select
        className="input"
        value={form.employment_type}
        onChange={(e) => update("employment_type", e.target.value as "company" | "contract")}
        aria-label="Employment type"
      >
        <option value="company">Company staff</option>
        <option value="contract">Contract staff</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.canteen_eligible}
          onChange={(e) => update("canteen_eligible", e.target.checked)}
        />
        Canteen eligible
      </label>
      <button className="btn-primary col-span-2" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save employee"}
      </button>
      {message && <p className="col-span-2 text-sm text-slate-500">{message}</p>}
    </form>
  );
}
