import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUserProfile, isAuthBypassed } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getCurrentUserProfile();
  const authBypassed = isAuthBypassed();
  const destination =
    profile?.role === "admin" ? "/admin" : profile?.role === "preparer" ? "/internal" : "/portal";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-secondary/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-white">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          US Tax Deals <span className="text-teal-300">RefundIQ</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          <Link href="/portal">Client Portal</Link>
          <Link href="/internal">Internal Dashboard</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <div className="flex items-center gap-3">
          {authBypassed ? (
            <>
              <Link href={destination}>
                <Button>Open app</Button>
              </Link>
            </>
          ) : profile ? (
            <>
              <Link href={destination}>
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  {profile.fullName ?? "Dashboard"}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
