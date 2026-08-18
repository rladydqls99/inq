import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm border border-inq-line bg-inq-canvas text-inq-on-highlight transition-colors focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-inq-highlight data-checked:bg-inq-highlight",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
