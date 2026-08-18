import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-bold leading-[1.4] transition-[background-color,color,transform] duration-180 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-inq-line disabled:bg-inq-line disabled:text-inq-ink-soft motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-inq-ink text-inq-canvas hover:bg-inq-ink-soft active:bg-inq-highlight-strong active:text-inq-on-highlight",
        primary:
          "border-0 bg-inq-ink text-inq-canvas hover:bg-inq-ink-soft active:bg-inq-highlight-strong active:text-inq-on-highlight",
        secondary:
          "border border-inq-line bg-inq-canvas text-inq-ink hover:bg-inq-surface",
        destructive:
          "border border-inq-error/40 bg-[color-mix(in_srgb,var(--inq-error)_10%,var(--inq-canvas))] text-inq-error hover:bg-[color-mix(in_srgb,var(--inq-error)_16%,var(--inq-canvas))]",
        danger:
          "border border-inq-error/40 bg-[color-mix(in_srgb,var(--inq-error)_10%,var(--inq-canvas))] text-inq-error hover:bg-[color-mix(in_srgb,var(--inq-error)_16%,var(--inq-canvas))]",
        ghost: "border-0 bg-transparent text-inq-ink hover:bg-inq-surface",
      },
      size: {
        default: "min-h-12 px-[18px] py-3",
        compact: "min-h-11 px-3 py-2",
        icon: "size-11 p-0",
        floating: "size-12 rounded-full p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    type?: "button" | "submit" | "reset";
  };

function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
