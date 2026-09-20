import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role =
  | "hr_admin"
  | "hr_officer"
  | "canteen_user"
  | "department_head"
  | "payroll_user"
  | "management";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  department_id: string | null;
  employee_id: string | null;
  active: boolean;
};

/**
 * Loads the signed-in user's profile (role, department scope). Redirects to
 * /login if not authenticated. Optionally restrict the page to a set of
 * roles — anyone else is redirected to /dashboard.
 */
export async function requireProfile(allowedRoles?: Role[]): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, department_id, employee_id, active")
    .eq("id", user.id)
    .single();

  if (error || !profile || !profile.active) redirect("/login");

  if (allowedRoles && !allowedRoles.includes(profile.role as Role)) {
    redirect("/dashboard");
  }

  return profile as Profile;
}

export const ROLE_LABELS: Record<Role, string> = {
  hr_admin: "HR Admin",
  hr_officer: "HR Officer",
  canteen_user: "Canteen",
  department_head: "Department Head",
  payroll_user: "Payroll",
  management: "Management",
};
