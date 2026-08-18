import type { ButtonHTMLAttributes } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "default" | "compact" | "icon" | "floating";
};

const variants = {
  primary: "default",
  secondary: "secondary",
  danger: "destructive",
  ghost: "ghost",
} as const;

export function Button({
  className = "",
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      className={className}
      variant={variants[variant]}
      size={size}
      type={type}
      {...props}
    />
  );
}
