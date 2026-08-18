import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("block w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track
        className="relative h-1 w-full overflow-hidden rounded-full bg-inq-line"
        data-slot="progress-track"
      >
        <ProgressPrimitive.Indicator
          className="h-full bg-inq-highlight-strong transition-[width] duration-180 motion-reduce:transition-none"
          data-slot="progress-indicator"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
