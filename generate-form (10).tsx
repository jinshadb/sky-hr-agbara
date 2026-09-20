"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateTickets } from "@/app/actions/tickets";

export default function GenerateForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snacks">("lunch");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateTickets(date, meal);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Generated ${res.created?.length ?? 0} ticket(s).`);
        router.push(`/tickets?date=${date}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-sm font-medium block mb-1">Date</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Meal</label>
        <select className="input" value={meal} onChange={(e) => setMeal(e.target.value as any)}>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snacks">Snacks</option>
        </select>
      </div>
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate tickets from approved headcount"}
      </button>
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </form>
  );
}
