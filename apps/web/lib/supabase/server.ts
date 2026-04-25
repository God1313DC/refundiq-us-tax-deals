import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie") ?? "";

  return createServerClient(
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
        setAll() {
          // Cookie writes are handled in route handlers / middleware.
        }
      }
    }
  );
}
