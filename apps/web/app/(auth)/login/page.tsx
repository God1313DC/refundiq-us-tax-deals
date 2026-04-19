import Link from "next/link";

import { signInAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Client sign in</p>
        <CardTitle className="mt-3 text-3xl">Welcome back</CardTitle>
        <CardDescription className="mt-2">
          Access your estimate, upload documents, and track next steps securely.
        </CardDescription>
        <form action={signInAction} className="mt-8 space-y-4">
          <Input placeholder="Email address" type="email" name="email" required />
          <Input placeholder="Password" type="password" name="password" required />
          {params.error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>
          ) : null}
          {params.reset ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password updated. Sign in with your new credentials.
            </p>
          ) : null}
          <Button className="w-full">Sign in</Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          <Link href="/forgot-password" className="font-semibold text-primary">
            Forgot your password?
          </Link>
        </p>
        <p className="mt-6 text-sm text-muted">
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-primary">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
