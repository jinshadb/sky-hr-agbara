import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import GenerateForm from "./generate-form";

export default async function TicketsPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const date = searchParams.date || new Date().toISOString().slice(0, 10);

  const { data: tickets } = await supabase
    .from("canteen_tickets")
    .select("*, departments(name), shifts(name)")
    .eq("work_date", date)
    .order("ticket_number");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Digital Canteen Tickets</h1>
        <p className="text-sm text-slate-500">
          Generated automatically from approved headcount — one ticket per department/shift,
          carrying the eligible employee list. Nothing is typed twice.
        </p>
      </div>

      <div className="card">
        <GenerateForm defaultDate={date} />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Meal</th>
              <th>Authorized</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((t: any) => (
              <tr key={t.id}>
                <td className="font-medium">{t.ticket_number}</td>
                <td>{t.departments?.name ?? "—"}</td>
                <td>{t.shifts?.name ?? "—"}</td>
                <td className="capitalize">{t.meal_type}</td>
                <td>{t.authorized_headcount}</td>
                <td>
                  <span
                    className={`badge ${
                      t.status === "active"
                        ? "bg-green-100 text-green-700"
                        : t.status === "closed"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>
                  <Link className="text-brand-600 hover:underline text-sm" href={`/tickets/${t.id}`}>
                    View / QR
                  </Link>
                </td>
              </tr>
            ))}
            {(!tickets || tickets.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-6">
                  No tickets for this date yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
