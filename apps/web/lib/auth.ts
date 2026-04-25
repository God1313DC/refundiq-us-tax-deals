import { redirect } from "next/navigation";

import { canAccessRole } from "@/lib/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppRole, UserProfile } from "@/lib/types";

const LOCAL_DEMO_PROFILES: Record<AppRole, UserProfile> = {
  client: {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "Taylor Demo Client",
    email: "demo-client@ustaxdeals.local",
    role: "client",
    organizationId: null
  },
  preparer: {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "Pat Demo Preparer",
    email: "demo-preparer@ustaxdeals.local",
    role: "preparer",
    organizationId: null
  },
  admin: {
    id: "33333333-3333-4333-8333-333333333333",
    fullName: "Alex Demo Admin",
    email: "demo-admin@ustaxdeals.local",
    role: "admin",
    organizationId: null
  }
};

export function isAuthBypassed() {
  return process.env.AUTH_BYPASS === "true";
}

export async function getSessionUser() {
  if (isAuthBypassed()) {
    return {
      id: LOCAL_DEMO_PROFILES.client.id,
      email: LOCAL_DEMO_PROFILES.client.email,
      user_metadata: {
        full_name: LOCAL_DEMO_PROFILES.client.fullName
      }
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

async function ensureDefaultOrganization() {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "us-tax-deals")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await admin
    .from("organizations")
    .insert({
      name: "US Tax Deals",
      slug: "us-tax-deals"
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

async function ensureStarterCaseForClient(userId: string, organizationId: string | null) {
  if (!organizationId) return;

  const admin = createSupabaseAdminClient();
  const { data: existingCase } = await admin
    .from("cases")
    .select("id")
    .eq("client_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!existingCase?.id) {
    const caseNumber = `RIQ-${Math.floor(Math.random() * 9000) + 1000}`;
    await admin.from("cases").insert({
      organization_id: organizationId,
      client_user_id: userId,
      case_number: caseNumber,
      tax_year: Number(process.env.DEFAULT_TAX_YEAR ?? "2025"),
      status: "intake_in_progress",
      confidence_band: "low",
      filing_status: null,
      state_of_residence: null
    });
  }
}

export async function bootstrapUserProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null };
}) {
  const admin = createSupabaseAdminClient();
  const organizationId = await ensureDefaultOrganization();
  const fullName =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Client";

  await admin.from("users").upsert({
    id: user.id,
    organization_id: organizationId,
    full_name: fullName,
    email: user.email ?? `${user.id}@example.local`,
    role: "client"
  });

  await ensureStarterCaseForClient(user.id, organizationId);
}

async function ensureLocalDemoProfile(role: AppRole): Promise<UserProfile> {
  const template = LOCAL_DEMO_PROFILES[role];
  const organizationId = await ensureDefaultOrganization();
  const admin = createSupabaseAdminClient();

  await admin.from("users").upsert({
    id: template.id,
    organization_id: organizationId,
    full_name: template.fullName,
    email: template.email,
    role: template.role
  });

  if (role === "client") {
    await ensureStarterCaseForClient(template.id, organizationId);
  }

  return {
    ...template,
    organizationId
  };
}

async function getExistingBypassProfile(role: AppRole): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, full_name, email, role, organization_id")
    .eq("role", role)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  if (role === "client") {
    await ensureStarterCaseForClient(data.id, data.organization_id);
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    organizationId: data.organization_id,
  };
}

function resolveBypassRole(allowedRoles?: AppRole[]) {
  if (!allowedRoles?.length) return "client";
  if (allowedRoles.length === 1) return allowedRoles[0];
  if (allowedRoles.includes("client")) return "client";
  if (allowedRoles.includes("preparer")) return "preparer";
  return "admin";
}

export async function getCurrentUserProfile(preferredRole?: AppRole): Promise<UserProfile | null> {
  if (isAuthBypassed()) {
    const role = preferredRole ?? "client";
    const existing = await getExistingBypassProfile(role);
    return existing ?? ensureLocalDemoProfile(role);
  }

  const user = await getSessionUser();
  if (!user) return null;

  const loadProfile = async () => {
    const admin = createSupabaseAdminClient();
    return admin
      .from("users")
      .select("id, full_name, email, role, organization_id")
      .eq("id", user.id)
      .single();
  };

  let { data, error } = await loadProfile();

  if (error || !data) {
    await bootstrapUserProfile({
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.user_metadata?.full_name ?? null }
    });
    const retry = await loadProfile();
    data = retry.data;
    error = retry.error;
  }

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
  const profile = isAuthBypassed()
    ? await getCurrentUserProfile(resolveBypassRole(allowedRoles))
    : await requireUser();

  if (!profile) {
    redirect("/login");
  }

  if (!canAccessRole(profile.role, allowedRoles)) {
    redirect(profile.role === "client" ? "/portal" : "/internal");
  }
  return profile;
}
