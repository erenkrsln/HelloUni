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
          "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all",
          "hover:bg-accent",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

