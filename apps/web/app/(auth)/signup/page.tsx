import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAuthBypassed } from "@/lib/auth";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isAuthBypassed()) {
    redirect("/portal");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Create account</p>
        <CardTitle className="mt-3 text-3xl">Start your secure intake</CardTitle>
        <CardDescription className="mt-2">
          Create a client account to upload documents, answer intake questions, and receive an estimated result for review.
        </CardDescription>
        <form action={signUpAction}>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Input placeholder="Full name" name="full_name" className="md:col-span-2" required />
            <Input placeholder="Email address" name="email" type="email" className="md:col-span-2" required />
            <Input placeholder="Password" name="password" type="password" required />
            <Input placeholder="Confirm password" name="confirm_password" type="password" required />
          </div>
          {params.error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>
          ) : null}
          <Button className="mt-6 w-full">Create secure account</Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
