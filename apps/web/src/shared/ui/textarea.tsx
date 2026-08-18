import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-32 w-full rounded-md border border-inq-line bg-inq-canvas px-3.5 py-3 font-mono text-sm font-medium text-inq-ink outline-none transition-[border-color,box-shadow] duration-180 placeholder:text-inq-ink-soft focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30 disabled:cursor-not-allowed disabled:bg-inq-surface disabled:text-inq-ink-soft motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
