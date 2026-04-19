import Link from "next/link";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Create a new password</p>
        <CardTitle className="mt-3 text-3xl">Finish account recovery</CardTitle>
        <CardDescription className="mt-2">
          Set a new password to continue using RefundIQ. Final filing still requires review by a qualified tax professional.
        </CardDescription>
        <form action={resetPasswordAction} className="mt-8 space-y-4">
          <Input placeholder="New password" type="password" name="password" required />
          <Input placeholder="Confirm new password" type="password" name="confirm_password" required />
          {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
          <Button className="w-full">Save new password</Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Return to{" "}
          <Link href="/login" className="font-semibold text-primary">
            sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
