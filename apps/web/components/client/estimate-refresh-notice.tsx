"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  active: boolean;
};

export function EstimateRefreshNotice({ active }: Props) {
  const router = useRouter();
  const refreshCount = useRef(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      refreshCount.current += 1;
      router.refresh();
      if (refreshCount.current >= 6) {
        clearInterval(interval);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [active, router]);

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-foreground">
      Your documents were received and processing has started. We are refreshing the estimate in the background as OCR,
      extraction, and review checks complete.
    </div>
  );
}
