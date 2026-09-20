import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import TicketQr from "./ticket-qr";
import CloseButton from "./close-button";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  await requireProfile(["hr_admin", "hr_officer", "canteen_user"]);
  const supabase = createClient();

  const { data: ticketData } = await supabase
    .from("canteen_tickets")
    .select("*, departments(name), shifts(name)")
    .eq("id", params.id)
    .single();
  const ticket = ticketData as any;

  const { data: eligible } = await supabase
    .from("ticket_eligible_employees")
    .select("employee_id, employees(employee_id, name)")
    .eq("ticket_id", params.id);

  const { data: served } = await supabase
    .from("meal_records")
    .select("employee_id")
    .eq("ticket_id", params.id);
  const servedSet = new Set(((served ?? []) as Array<{ employee_id: string }>).map((s) => s.employee_id));

  if (!ticket) return <p>Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{ticket.ticket_number}</h1>
        <p className="text-sm text-slate-500">
          {ticket.departments?.name ?? "All departments"} · {ticket.shifts?.name} ·{" "}
          <span className="capitalize">{ticket.meal_type}</span> · {ticket.work_date}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card flex flex-col items-center justify-center">
          <TicketQr value={ticket.qr_code_data} />
          <p className="text-xs text-slate-500 mt-2">Scan at canteen counter</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Authorized headcount</p>
          <p className="text-3xl font-semibold">{ticket.authorized_headcount}</p>
          <p className="text-sm text-slate-500 mt-3">Served so far</p>
          <p className="text-2xl font-semibold">{servedSet.size}</p>
        </div>
        <div className="card space-y-2">
          <p className="text-sm text-slate-500">Status: <b className="capitalize">{ticket.status}</b></p>
          {ticket.status === "active" && <CloseButton ticketId={ticket.id} />}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-medium mb-2">Eligible employees</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Meal status</th>
            </tr>
          </thead>
          <tbody>
            {(eligible ?? []).map((e: any) => (
              <tr key={e.employee_id}>
                <td>{e.employees?.employee_id}</td>
                <td>{e.employees?.name}</td>
                <td>
                  <span
                    className={`badge ${
                      servedSet.has(e.employee_id) ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {servedSet.has(e.employee_id) ? "Served" : "Not served"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
