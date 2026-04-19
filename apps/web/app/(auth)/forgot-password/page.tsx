import Link from "next/link";

import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Account recovery</p>
        <CardTitle className="mt-3 text-3xl">Reset your password</CardTitle>
        <CardDescription className="mt-2">
          We will send a secure password reset link so you can regain access to your RefundIQ account.
        </CardDescription>
        <form action={requestPasswordResetAction} className="mt-8 space-y-4">
          <Input placeholder="Email address" type="email" name="email" required />
          {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
          {params.success ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password reset instructions were sent if the email is registered.
            </p>
          ) : null}
          <Button className="w-full">Send reset link</Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Back to{" "}
          <Link href="/login" className="font-semibold text-primary">
            sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
