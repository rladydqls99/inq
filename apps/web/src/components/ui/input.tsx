import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-md border border-inq-line bg-inq-canvas px-3.5 py-3 text-base text-inq-ink outline-none transition-[border-color,box-shadow] duration-180 placeholder:text-inq-ink-soft focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-inq-surface disabled:text-inq-ink-soft motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
