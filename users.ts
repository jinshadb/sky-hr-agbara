"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, type Role } from "@/lib/auth";

export async function inviteUser(input: {
  email: string;
  full_name: string;
  role: Role;
  department_id?: string | null;
}) {
  await requireProfile(["hr_admin"]);
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.inviteUserByEmail(input.email);
  if (error || !created.user) return { error: error?.message ?? "Could not invite user" };

  const supabase = createClient();
  const { error: profileErr } = await supabase.from("profiles").insert({
    id: created.user.id,
    full_name: input.full_name,
    role: input.role,
    department_id: input.department_id || null,
    active: true,
  });
  if (profileErr) return { error: profileErr.message };

  revalidatePath("/users");
  return { error: null };
}

export async function setUserActive(profileId: string, active: boolean) {
  await requireProfile(["hr_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  return { error: null };
}
