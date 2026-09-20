import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function AuditPage() {
  await requireProfile(["hr_admin"]);
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-slate-500">
          Every approval, correction and reopen is recorded automatically with user, timestamp and reason.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Table</th>
              <th>Action</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l: any) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.profiles?.full_name ?? "—"}</td>
                <td>{l.table_name}</td>
                <td className="capitalize">{l.action}</td>
                <td>{l.reason ?? "—"}</td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-6">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
