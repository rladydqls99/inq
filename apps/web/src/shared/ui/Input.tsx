import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const controlClassName =
  "min-h-12 rounded-md border border-inq-line bg-inq-canvas px-3.5 py-3 text-base text-inq-ink outline-none transition-[border-color,box-shadow] duration-180 placeholder:text-inq-ink-soft focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30 disabled:cursor-not-allowed disabled:bg-inq-surface disabled:text-inq-ink-soft motion-reduce:transition-none";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClassName} ${className}`} {...props} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClassName} ${className}`} {...props} />;
}
