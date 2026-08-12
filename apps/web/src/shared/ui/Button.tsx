import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "default" | "compact" | "icon" | "floating";
};

const variants = {
  primary:
    "border-0 bg-inq-ink text-inq-canvas hover:bg-inq-ink-soft active:bg-inq-highlight-strong active:text-inq-on-highlight",
  secondary:
    "border border-inq-line bg-inq-canvas text-inq-ink hover:bg-inq-surface",
  danger:
    "border border-inq-error/40 bg-[color-mix(in_srgb,var(--inq-error)_10%,var(--inq-canvas))] text-inq-error hover:bg-[color-mix(in_srgb,var(--inq-error)_16%,var(--inq-canvas))]",
  ghost: "border-0 bg-transparent text-inq-ink hover:bg-inq-surface",
};

const sizes = {
  default: "min-h-12 px-4 py-3 text-sm",
  compact: "min-h-11 px-3 text-sm",
  icon: "size-11 p-0",
  floating: "size-14 rounded-full p-0",
};

export function Button({
  className = "",
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-bold leading-[1.4] transition-[background-color,color,transform] duration-180 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-inq-line disabled:bg-inq-line disabled:text-inq-ink-soft motion-reduce:transition-none ${variants[variant]} ${sizes[size]} ${className}`}
      type={type}
      {...props}
    />
  );
}
