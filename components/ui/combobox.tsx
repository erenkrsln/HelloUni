"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Auswählen...",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [renderKey, setRenderKey] = React.useState(0);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  // Force re-render when popover opens or value changes
  React.useEffect(() => {
    if (open) {
      setRenderKey(prev => prev + 1);
    }
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {open && (
        <PopoverContent className="w-full p-0" align="start" key={`popover-${value}-${renderKey}`}>
          <div className="max-h-[300px] overflow-auto">
            {options.map((option) => (
              <button
                key={`${option.value}-${value}-${renderKey}`}
                type="button"
                className="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

