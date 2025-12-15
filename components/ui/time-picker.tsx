"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    return {
      hours: now.getHours(),
      minutes: now.getMinutes()
    };
  };

  const [hours, setHours] = React.useState(() => {
    if (value) {
      return parseInt(value.split(":")[0]) || 0;
    }
    return getCurrentTime().hours;
  });
  const [minutes, setMinutes] = React.useState(() => {
    if (value) {
      return parseInt(value.split(":")[1]) || 0;
    }
    return getCurrentTime().minutes;
  });
  const [isOpen, setIsOpen] = React.useState(false);
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHours(parseInt(h) || 0);
      setMinutes(parseInt(m) || 0);
    }
  }, [value]);

  // Setze aktuelle Uhrzeit beim Öffnen und scrolle zu den Werten
  React.useEffect(() => {
    if (isOpen) {
      const currentTime = getCurrentTime();
      setHours(currentTime.hours);
      setMinutes(currentTime.minutes);
      
      // Wenn kein Wert vorhanden ist, setze die aktuelle Zeit auch im Formular
      if (!value) {
        onChange?.(`${currentTime.hours.toString().padStart(2, "0")}:${currentTime.minutes.toString().padStart(2, "0")}`);
      }
      
      // Scrolle nach einem kurzen Timeout, um sicherzustellen, dass das DOM bereit ist
      setTimeout(() => {
        if (hoursRef.current) {
          const selectedHour = hoursRef.current.querySelector(`[data-hour="${currentTime.hours}"]`);
          selectedHour?.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
        if (minutesRef.current) {
          const selectedMinute = minutesRef.current.querySelector(`[data-minute="${currentTime.minutes}"]`);
          selectedMinute?.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }, 50);
    }
  }, [isOpen]);

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    onChange?.(`${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`);
  };

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleScroll = (type: 'hours' | 'minutes', value: number) => {
    if (type === 'hours') {
      handleTimeChange(value, minutes);
    } else {
      handleTimeChange(hours, value);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            </svg>
          </div>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "block w-full ps-9 pe-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#D08945] focus:border-[#D08945] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-left placeholder:text-gray-500",
              !value && "text-gray-500",
              className
            )}
          >
            {value ? formatTime(hours, minutes) : placeholder}
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="flex items-center bg-gray-50 rounded-lg">
          {/* Hours Wheel */}
          <div 
            ref={hoursRef}
            className="h-48 w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                data-hour={i}
                onClick={() => handleScroll('hours', i)}
                className={cn(
                  "h-12 flex items-center justify-center text-lg font-medium cursor-pointer snap-center transition-colors",
                  hours === i 
                    ? "text-[#D08945] font-semibold bg-white" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {i.toString().padStart(2, "0")}
              </div>
            ))}
          </div>
          
          <div className="text-2xl font-semibold text-gray-400 px-2">:</div>
          
          {/* Minutes Wheel */}
          <div 
            ref={minutesRef}
            className="h-48 w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <div
                key={i}
                data-minute={i}
                onClick={() => handleScroll('minutes', i)}
                className={cn(
                  "h-12 flex items-center justify-center text-lg font-medium cursor-pointer snap-center transition-colors",
                  minutes === i 
                    ? "text-[#D08945] font-semibold bg-white" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {i.toString().padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-gray-200">
          <Button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full"
            size="sm"
          >
            Fertig
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

