import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-lg text-center">
        <CardTitle className="text-3xl">Page not found</CardTitle>
        <CardDescription className="mt-3">
          The page you requested does not exist in this RefundIQ MVP demo.
        </CardDescription>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button>Return home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
