import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bootstrapUserProfile } from "@/lib/auth";

function destinationForRole(role?: string | null) {
  return role === "client" ? "/portal" : role === "admin" ? "/admin" : "/internal";
}

function appBaseUrl() {
  return (
    process.env.FRONTEND_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const baseUrl = appBaseUrl();

  const pendingCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ?.split(/;\s*/)
            .filter(Boolean)
            .map((part) => {
              const index = part.indexOf("=");
              return {
                name: part.slice(0, index),
                value: decodeURIComponent(part.slice(index + 1))
              };
            }) ?? [];
        },
        setAll(newCookies) {
          newCookies.forEach((cookie) => {
            pendingCookies.push(cookie);
          });
        }
      }
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl),
      { status: 303 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=Unable%20to%20create%20session", baseUrl), {
      status: 303
    });
  }

  await bootstrapUserProfile({
    id: user.id,
    email: user.email,
    user_metadata: { full_name: user.user_metadata?.full_name ?? null }
  });

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  const response = NextResponse.redirect(new URL(destinationForRole(profile?.role), baseUrl), { status: 303 });
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
