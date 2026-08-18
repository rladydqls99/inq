import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadcnInput className={className} {...props} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const { size, ...nativeSelectProps } = props;
  void size;

  return <NativeSelect className={className} {...nativeSelectProps} />;
}
