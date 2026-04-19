import { redirect } from "next/navigation";

import { canAccessRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppRole, UserProfile } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role, organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    organizationId: data.organization_id
  };
}

export async function requireUser() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const profile = await requireUser();
  if (!canAccessRole(profile.role, allowedRoles)) {
    redirect(profile.role === "client" ? "/portal" : "/internal");
  }
  return profile;
}
