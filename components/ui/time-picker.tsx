"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Uhrzeit auswählen",
  className,
  disabled,
}: TimePickerProps) {
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Setze aktuelle Uhrzeit beim ersten Mount, wenn kein Wert vorhanden ist
  React.useEffect(() => {
    if (!value) {
      onChange?.(getCurrentTime());
    }
  }, []); // Nur beim ersten Mount ausführen

  return (
    <div className="relative">
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
        </svg>
      </div>
      <input
        type="time"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          "block w-full ps-9 pe-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#D08945] focus:border-[#D08945] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
          "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
          "[&::-moz-calendar-picker-indicator]:hidden",
          !value && "text-gray-500",
          className
        )}
      />
    </div>
  );
}
