import { createClient } from "@/lib/supabase/server";
import { requireProfile, ROLE_LABELS } from "@/lib/auth";
import InviteForm from "./invite-form";
import ActiveToggle from "./active-toggle";

export default async function UsersPage() {
  await requireProfile(["hr_admin"]);
  const supabase = createClient();

  const [{ data: profiles }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("*, departments(name)").order("full_name"),
    supabase.from("departments").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users & Roles</h1>
        <p className="text-sm text-slate-500">
          Invite users and assign one of the six roles. Sends a Supabase Auth invite email.
        </p>
      </div>

      <div className="card">
        <InviteForm departments={departments ?? []} />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p: any) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role}</td>
                <td>{p.departments?.name ?? "—"}</td>
                <td>
                  <ActiveToggle profileId={p.id} active={p.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
