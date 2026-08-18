import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

type NativeSelectProps = Omit<ComponentProps<"select">, "size"> & {
  size?: "default" | "compact";
  containerClassName?: string;
};

function NativeSelect({
  className,
  containerClassName,
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn("relative w-full", containerClassName)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "min-h-12 w-full appearance-none rounded-md border border-inq-line bg-inq-canvas px-3.5 py-3 pr-10 text-base text-inq-ink outline-none transition-[border-color,box-shadow] duration-180 focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-inq-surface disabled:text-inq-ink-soft data-[size=compact]:min-h-11 data-[size=compact]:py-2",
          className,
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-inq-ink-soft"
        aria-hidden="true"
      />
    </div>
  );
}

export { NativeSelect };
