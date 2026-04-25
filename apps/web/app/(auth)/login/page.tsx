import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { isAuthBypassed } from "@/lib/auth";

export default function LoginPage() {
  if (isAuthBypassed()) {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Client sign in</p>
        <CardTitle className="mt-3 text-3xl">Welcome back</CardTitle>
        <CardDescription className="mt-2">
          Access your estimate, upload documents, and track next steps securely.
        </CardDescription>
        <LoginForm />
      </Card>
    </div>
  );
}
