import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label-Komponente für Formulare
 */
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      style={{ color: "#6B5A3D" }}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };

