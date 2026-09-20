"use client";

import { useState, useTransition } from "react";
import { saveVerification, approveHeadcount } from "@/app/actions/headcount";

export default function HeadcountRow({
  id,
  department,
  shift,
  biometric,
  verified,
  difference,
  reason: initialReason,
  status,
  canApprove,
}: {
  id: string;
  department: string;
  shift: string;
  biometric: number;
  verified: number | null;
  difference: number;
  reason: string | null;
  status: "pending" | "approved";
  canApprove: boolean;
}) {
  const [verifiedInput, setVerifiedInput] = useState(verified ?? biometric);
  const [reason, setReason] = useState(initialReason ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const isApproved = status === "approved";
  const diff = verifiedInput - biometric;

  function save() {
    startTransition(async () => {
      const res = await saveVerification(id, Number(verifiedInput), reason);
      setMessage(res.error ? res.error : "Saved.");
    });
  }

  function approve() {
    startTransition(async () => {
      const res = await approveHeadcount(id);
      setMessage(res.error ? res.error : `Approved — ${res.approvedCount} attendance record(s) locked.`);
    });
  }

  return (
    <tr>
      <td className="font-medium">{department}</td>
      <td>{shift}</td>
      <td>{biometric}</td>
      <td>
        {isApproved ? (
          verified
        ) : (
          <input
            type="number"
            className="input w-20"
            value={verifiedInput}
            onChange={(e) => setVerifiedInput(Number(e.target.value))}
          />
        )}
      </td>
      <td className={diff !== 0 ? "text-amber-600 font-medium" : ""}>{diff}</td>
      <td>
        {isApproved ? (
          reason || "—"
        ) : (
          <input
            className="input"
            placeholder="Reason for difference"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </td>
      <td>
        <span className={`badge ${isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {status}
        </span>
      </td>
      <td className="space-x-2 whitespace-nowrap">
        {!isApproved && (
          <>
            <button className="btn-secondary" onClick={save} disabled={pending}>
              Save
            </button>
            {canApprove && (
              <button className="btn-primary" onClick={approve} disabled={pending || verified === null}>
                Approve
              </button>
            )}
          </>
        )}
        {message && <div className="text-xs text-slate-500 mt-1">{message}</div>}
      </td>
    </tr>
  );
}
