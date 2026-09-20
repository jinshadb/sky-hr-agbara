"use client";

import { useTransition } from "react";
import { setUserActive } from "@/app/actions/users";

export default function ActiveToggle({ profileId, active }: { profileId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={`badge ${active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}
      disabled={pending}
      onClick={() => startTransition(async () => {
        await setUserActive(profileId, !active);
      })}
    >
      {pending ? "…" : active ? "active" : "disabled"}
    </button>
  );
}
