import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border border-inq-line bg-inq-canvas focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-inq-highlight data-checked:bg-inq-highlight",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2 rounded-full bg-inq-on-highlight" />
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
