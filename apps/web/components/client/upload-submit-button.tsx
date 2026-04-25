"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function UploadSubmitButton() {
  const { pending } = useFormStatus();

  return <Button disabled={pending}>{pending ? "Uploading and starting review..." : "Submit documents"}</Button>;
}
