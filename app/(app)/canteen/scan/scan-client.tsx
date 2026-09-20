"use client";

import { useEffect, useRef, useState } from "react";
import { serveMeal } from "@/app/actions/canteen";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  ticket_number: string;
  meal_type: string;
  authorized_headcount: number;
  status: string;
  departments: { name: string } | null;
  shifts: { name: string } | null;
};

export default function ScanClient({ tickets }: { tickets: Ticket[] }) {
  const [ticketId, setTicketId] = useState(tickets[0]?.id ?? "");
  const [served, setServed] = useState(0);
  const [manualInput, setManualInput] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const supabase = createClient();

  const ticket = tickets.find((t) => t.id === ticketId);

  async function refreshCount(id: string) {
    const { count } = await supabase
      .from("meal_records")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", id);
    setServed(count ?? 0);
  }

  useEffect(() => {
    if (ticketId) refreshCount(ticketId);
  }, [ticketId]);

  async function handleResolve(value: string, method: "qr" | "manual_search") {
    if (!ticketId || !value.trim()) return;
    const res = await serveMeal(ticketId, value.trim(), method);
    if (res.error) {
      setFeedback({ ok: false, text: res.error });
    } else {
      setFeedback({ ok: true, text: `Served: ${res.employeeName} (${res.employeeId})` });
      refreshCount(ticketId);
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    handleResolve(manualInput, "manual_search");
    setManualInput("");
  }

  async function startScanner() {
    if (scanning) return;
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText: string) => {
          handleResolve(decodedText, "qr");
        },
        () => {}
      );
    } catch (err) {
      setFeedback({ ok: false, text: "Could not access camera. Use manual search instead." });
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tickets.length === 0) {
    return <p className="card text-slate-500">No active canteen ticket for today yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="text-sm font-medium block mb-1">Active ticket</label>
        <select
          className="input"
          value={ticketId}
          onChange={(e) => {
            stopScanner();
            setTicketId(e.target.value);
          }}
        >
          {tickets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.ticket_number} — {t.departments?.name ?? "All"} · {t.shifts?.name} ·{" "}
              {t.meal_type} ({t.authorized_headcount} authorized)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-slate-500">Authorized</p>
          <p className="text-2xl font-semibold">{ticket?.authorized_headcount ?? 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Served</p>
          <p className="text-2xl font-semibold text-green-600">{served}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Balance</p>
          <p className="text-2xl font-semibold">{Math.max((ticket?.authorized_headcount ?? 0) - served, 0)}</p>
        </div>
      </div>

      {feedback && (
        <p className={`rounded-lg px-3 py-2 text-sm ${feedback.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {feedback.text}
        </p>
      )}

      <div className="card">
        <p className="text-sm font-medium mb-2">Scan employee QR</p>
        <div id="qr-reader" className="w-full max-w-xs mx-auto" />
        <div className="flex justify-center mt-2">
          {!scanning ? (
            <button className="btn-primary" onClick={startScanner}>
              Start camera
            </button>
          ) : (
            <button className="btn-secondary" onClick={stopScanner}>
              Stop camera
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-medium mb-2">Or search Employee ID</p>
        <form onSubmit={submitManual} className="flex gap-2">
          <input
            className="input"
            placeholder="Employee ID"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" type="submit">
            Mark served
          </button>
        </form>
      </div>
    </div>
  );
}
