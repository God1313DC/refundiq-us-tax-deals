"use server";

import { redirect } from "next/navigation";

import { bootstrapUserProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function destinationForRole(role?: string | null) {
  return role === "client" ? "/portal" : role === "admin" ? "/admin" : "/internal";
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
    let { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
    if (!profile) {
      await bootstrapUserProfile({
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.user_metadata?.full_name ?? null }
      });
      const retry = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
      profile = retry.data;
    }
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
    await bootstrapUserProfile({
      id: data.user.id,
      email,
      user_metadata: { full_name: fullName }
    });
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
