"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Funktion zur Erkennung mobiler Geräte
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};

export function TimePicker({
  value,
  onChange,
  placeholder = "Uhrzeit auswählen",
  className,
  disabled,
}: TimePickerProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Prüfe beim Mount und bei Resize, ob es ein mobiles Gerät ist
  React.useEffect(() => {
    setIsMobile(isMobileDevice());
    
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Setze aktuelle Uhrzeit beim ersten Mount, wenn kein Wert vorhanden ist
  React.useEffect(() => {
    if (!value) {
      onChange?.(getCurrentTime());
    }
  }, []); // Nur beim ersten Mount ausführen

  return (
    <div className="relative w-full">
      {/* Icon immer links anzeigen (sowohl auf Mobile als auch Desktop) */}
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none z-10">
        <Clock className="h-4 w-4 text-gray-500" />
      </div>
      <input
        type="time"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          "block w-full max-w-full h-11 px-4 py-2 ps-9 text-base rounded-lg border bg-white",
          "placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all",
          !value && "text-gray-500",
          // Native Icon immer verstecken (sowohl auf Mobile als auch Desktop)
          // Unser eigenes Icon wird links angezeigt
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-moz-calendar-picker-indicator]:hidden",
          className
        )}
        style={{
          borderColor: "rgba(209, 213, 219, 1)",
          WebkitAppearance: "none",
          appearance: "none",
          MozAppearance: "textfield",
          boxSizing: "border-box",
          minWidth: "0",
          width: "100%",
          maxWidth: "100%",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#D08945";
          e.target.style.boxShadow = "0 0 0 2px rgba(208, 137, 69, 0.2)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(209, 213, 219, 1)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}
