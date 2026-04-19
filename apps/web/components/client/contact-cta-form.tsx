"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ContactCtaForm({ name, email }: { name: string; email: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("I’m ready to move forward with review and filing support.");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        message
      })
    });

    setStatus(response.ok ? "success" : "error");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="text-sm font-medium text-foreground">Tell us how you want to proceed</label>
      <textarea
        className="min-h-32 w-full rounded-[22px] border border-border bg-white p-4 text-sm"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="I’m ready to move forward with review and filing support."
      />
      <Button disabled={status === "submitting"}>{status === "submitting" ? "Sending..." : "Send contact request"}</Button>
      {status === "success" ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Contact request received. US Tax Deals can follow up to finalize and file accurately.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Contact request could not be sent. Please try again or use the booking link.
        </p>
      ) : null}
    </form>
  );
}
