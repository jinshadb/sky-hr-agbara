"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkAssignEmployees } from "@/app/actions/employees";

type Employee = {
  id: string;
  employee_id: string;
  name: string;
  employment_type: string;
  department: string | null;
  shift: string | null;
};

export default function EmployeeAssignment({
  employees,
  departments,
  shifts,
}: {
  employees: Employee[];
  departments: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applyDepartment, setApplyDepartment] = useState(false);
  const [applyShift, setApplyShift] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [employee.employee_id, employee.name, employee.department, employee.shift, employee.employment_type]
        .some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [employees, query]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((employee) => selectedIds.includes(employee.id));

  function toggleFiltered() {
    setSelectedIds((current) => {
      if (allFilteredSelected) {
        const visible = new Set(filtered.map((employee) => employee.id));
        return current.filter((id) => !visible.has(id));
      }
      return Array.from(new Set([...current, ...filtered.map((employee) => employee.id)]));
    });
  }

  function toggleEmployee(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await bulkAssignEmployees(
        selectedIds,
        applyDepartment,
        departmentId,
        applyShift,
        shiftId
      );
      if (result.error) {
        setMessage(`Error: ${result.error}`);
        return;
      }
      setMessage(`Updated ${result.updated} employee record(s).`);
      setSelectedIds([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applyDepartment}
            onChange={(e) => setApplyDepartment(e.target.checked)}
          />
          Set department
        </label>
        <select
          className="input"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          disabled={!applyDepartment}
        >
          <option value="">Choose department…</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
        <span />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applyShift}
            onChange={(e) => setApplyShift(e.target.checked)}
          />
          Set shift
        </label>
        <select
          className="input"
          value={shiftId}
          onChange={(e) => setShiftId(e.target.value)}
          disabled={!applyShift}
        >
          <option value="">Choose shift…</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>{shift.name}</option>
          ))}
        </select>
        <button
          className="btn-primary"
          type="submit"
          form="employee-assignment-form"
          disabled={pending || selectedIds.length === 0 || (!applyDepartment && !applyShift)}
        >
          {pending ? "Saving…" : `Apply to ${selectedIds.length} selected`}
        </button>
      </div>

      <form id="employee-assignment-form" onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-sm"
            placeholder="Search ID, name, department, or shift"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-secondary" type="button" onClick={toggleFiltered}>
            {allFilteredSelected ? "Deselect filtered" : "Select filtered"}
          </button>
          <span className="text-sm text-slate-500">{filtered.length} shown · {selectedIds.length} selected</span>
        </div>

        <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
          <table className="table-base">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select filtered employees" checked={allFilteredSelected} onChange={toggleFiltered} /></th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Department</th>
                <th>Shift</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                      aria-label={`Select ${employee.employee_id}`}
                    />
                  </td>
                  <td>{employee.employee_id}</td>
                  <td>{employee.name}</td>
                  <td className="capitalize">{employee.employment_type}</td>
                  <td>{employee.department ?? "—"}</td>
                  <td>{employee.shift ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-4">No matching employees.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </form>
    </div>
  );
}
