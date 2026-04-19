import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-28 w-full rounded-[20px] border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted focus:border-primary",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
