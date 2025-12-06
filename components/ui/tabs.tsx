"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs-Komponente zum Umschalten zwischen Login und Registrierung
 */

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultValue: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, defaultValue, onValueChange, children, ...props }, ref) => {
  const [value, setValue] = React.useState(defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-lg p-1 w-full",
      className
    )}
    style={{ backgroundColor: "rgba(208, 137, 69, 0.1)" }}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
  }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D08945]",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: isActive ? "rgba(208, 137, 69, 0.15)" : "transparent",
        color: isActive ? "#8B6F47" : "#9CA3AF",
        fontWeight: isActive ? "600" : "500"
      }}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
  }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      ref={ref}
      className={cn("mt-2", className)}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };

