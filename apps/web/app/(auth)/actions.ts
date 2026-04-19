"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function destinationForRole(role?: string | null) {
  return role === "client" ? "/portal" : role === "admin" ? "/admin" : "/internal";
}

async function ensureClientCase(userId: string, email: string) {
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "us-tax-deals")
    .single();

  if (!org?.id) return;

  const { data: existingCase } = await admin
    .from("cases")
    .select("id")
    .eq("client_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingCase?.id) return;

  const caseNumber = `RIQ-${Math.floor(Math.random() * 9000) + 1000}`;
  await admin.from("cases").insert({
    organization_id: org.id,
    client_user_id: userId,
    case_number: caseNumber,
    tax_year: Number(process.env.DEFAULT_TAX_YEAR ?? "2025"),
    status: "intake_in_progress",
    confidence_band: "low",
    filing_status: null,
    state_of_residence: null
  });

  await admin.from("audit_logs").insert({
    organization_id: org.id,
    case_id: null,
    actor_id: userId,
    action: "client_signup_initialized_case",
    entity_type: "case_bootstrap",
    payload: { email }
  });
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const admin = createSupabaseAdminClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
    redirect(destinationForRole(profile?.role));
  }

  redirect("/portal");
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password !== confirmPassword) {
    redirect("/signup?error=Passwords%20do%20not%20match");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const admin = createSupabaseAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", "us-tax-deals")
      .single();

    await admin.from("users").upsert({
      id: data.user.id,
      organization_id: org?.id ?? null,
      full_name: fullName,
      email,
      role: "client"
    });

    await ensureClientCase(data.user.id, email);
  }

  redirect("/portal");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createSupabaseServerClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?success=1");
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (!password || password !== confirmPassword) {
    redirect("/reset-password?error=Passwords%20do%20not%20match");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) {
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
    redirect(`${destinationForRole(profile?.role)}?passwordReset=1`);
  }

  redirect("/login?reset=1");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
