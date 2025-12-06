import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input-Komponente für Formulare
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm",
          "placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all",
          className
        )}
        style={{
          borderColor: "rgba(208, 137, 69, 0.3)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#D08945";
          e.target.style.boxShadow = "0 0 0 2px rgba(208, 137, 69, 0.2)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(208, 137, 69, 0.3)";
          e.target.style.boxShadow = "none";
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

