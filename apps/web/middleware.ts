import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  if (process.env.AUTH_BYPASS === "true") {
    if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request
  });
  const cookieHeader = request.headers.get("cookie") ?? "";

  const supabase = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieHeader
            .split(/;\s*/)
            .filter(Boolean)
            .map((part) => {
              const index = part.indexOf("=");
              return {
                name: part.slice(0, index),
                value: decodeURIComponent(part.slice(index + 1))
              };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if ((pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password") && user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (!profile?.role) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "admin" ? "/admin" : profile?.role === "preparer" ? "/internal" : "/portal";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/login", "/signup", "/forgot-password", "/reset-password"]
};
