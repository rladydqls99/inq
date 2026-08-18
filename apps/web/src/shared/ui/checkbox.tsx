import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

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

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function Switch({ className = "", ...props }: SwitchProps) {
  return (
    <input
      className={`relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-inq-line transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-inq-canvas after:transition-transform checked:bg-inq-highlight checked:after:translate-x-5 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`}
      type="checkbox"
      {...props}
    />
  );
}

export { Checkbox, Switch };
