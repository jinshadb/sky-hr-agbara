"use client";

import { useTransition } from "react";
import { setEmployeeStatus } from "@/app/actions/employees";

export default function StatusToggle({
  employeeId,
  status,
}: {
  employeeId: string;
  status: "active" | "inactive";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={`badge ${status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setEmployeeStatus(employeeId, status === "active" ? "inactive" : "active");
        })
      }
      title="Click to toggle"
    >
      {pending ? "…" : status}
    </button>
  );
}
