"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const error = searchParams.get("error");

  function handleSubmit() {
    setSubmitting(true);
  }

  return (
    <>
      <form action="/auth/login" method="post" onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input placeholder="Email address" type="email" name="email" required />
        <Input placeholder="Password" type="password" name="password" required />
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {searchParams.get("reset") ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Password updated. Sign in with your new credentials.
          </p>
        ) : null}
        <Button className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
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
    </>
  );
}
