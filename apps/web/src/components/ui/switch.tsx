import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full bg-inq-line transition-colors focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-inq-highlight",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-5 translate-x-1 rounded-full bg-inq-canvas transition-transform data-checked:translate-x-6 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
