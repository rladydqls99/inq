import type { InputHTMLAttributes } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className = "", ...props }: CheckboxProps) {
  return (
    <input
      className={`size-5 shrink-0 cursor-pointer appearance-none rounded-sm border border-inq-line bg-inq-canvas transition-colors checked:border-inq-highlight checked:bg-inq-highlight checked:after:block checked:after:content-['✓'] checked:after:text-center checked:after:text-sm checked:after:font-extrabold checked:after:leading-[18px] checked:after:text-inq-on-highlight focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type="checkbox"
      {...props}
    />
  );
}

export function Switch({ className = "", ...props }: CheckboxProps) {
  return (
    <input
      className={`relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-inq-line transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-inq-canvas after:transition-transform checked:bg-inq-highlight checked:after:translate-x-5 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`}
      type="checkbox"
      {...props}
    />
  );
}
