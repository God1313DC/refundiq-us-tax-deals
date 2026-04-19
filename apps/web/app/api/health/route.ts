import { NextResponse } from "next/server";

export async function GET() {
  const fastapiBaseUrl = process.env.FASTAPI_BASE_URL ?? "";
  let backend = {
    reachable: false,
    status: "unavailable",
    details: null as Record<string, unknown> | null
  };

  if (fastapiBaseUrl) {
    try {
      const response = await fetch(`${fastapiBaseUrl}/health`, { cache: "no-store" });
      if (response.ok) {
        backend = {
          reachable: true,
          status: "ok",
          details: await response.json()
        };
      } else {
        backend.status = `http_${response.status}`;
      }
    } catch {
      backend.status = "unreachable";
    }
  }

  return NextResponse.json({
    status: backend.reachable ? "ok" : "degraded",
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "RefundIQ for US Tax Deals",
    frontendBaseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    testMode: process.env.TEST_MODE === "true",
    backend
  });
}
