"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "@/app/actions/users";
import type { Role } from "@/lib/auth";

const ROLES: Role[] = ["hr_admin", "hr_officer", "canteen_user", "department_head", "payroll_user", "management"];

export default function InviteForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("hr_officer");
  const [departmentId, setDepartmentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await inviteUser({ email, full_name: fullName, role, department_id: departmentId || null });
      if (res.error) setMessage(`Error: ${res.error}`);
      else {
        setMessage(`Invited ${email}.`);
        setEmail("");
        setFullName("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-2 items-end">
      <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {role === "department_head" && (
        <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
      </button>
      {message && <p className="md:col-span-5 text-sm text-slate-500">{message}</p>}
    </form>
  );
}
