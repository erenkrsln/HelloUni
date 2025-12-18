"use client";

import * as React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

// Funktion zur Erkennung mobiler Geräte
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};

// Konvertiere Date zu YYYY-MM-DD Format für input type="date"
const formatDateForInput = (date: Date | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Konvertiere YYYY-MM-DD String zu Date
const parseDateFromInput = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Datum auswählen",
  className,
  disabled,
}: DatePickerProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(value ? value.getMonth() : new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(value ? value.getFullYear() : new Date().getFullYear());

  // Prüfe beim Mount und bei Resize, ob es ein mobiles Gerät ist
  React.useEffect(() => {
    setIsMobile(isMobileDevice());
    
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Native Date Input Handler für mobile Geräte
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseDateFromInput(e.target.value);
    onChange?.(date);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange?.(newDate);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <button
          key={`prev-${i}`}
          type="button"
          className="h-8 w-8 text-xs text-gray-400 hover:bg-gray-100 active:bg-gray-200 rounded transition-colors touch-manipulation"
          onClick={() => {
            handlePrevMonth();
            handleDateClick(prevMonthDays - i);
          }}
        >
          {prevMonthDays - i}
        </button>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = new Date().getDate() === day &&
        new Date().getMonth() === currentMonth &&
        new Date().getFullYear() === currentYear;
      
      const isSelected = value
        ? value.getDate() === day && 
          value.getMonth() === currentMonth && 
          value.getFullYear() === currentYear
        : isToday; // Markiere heutiges Datum, wenn kein Wert ausgewählt ist
      
      days.push(
        <button
          key={`current-${day}`}
          type="button"
          onClick={() => handleDateClick(day)}
          className={cn(
            "h-8 w-8 text-xs rounded transition-colors font-medium touch-manipulation",
            isSelected && "bg-[#D08945] text-white hover:bg-[#D08945] active:bg-[#C07835]",
            !isSelected && "text-gray-900 hover:bg-gray-100 active:bg-gray-200"
          )}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  // Native Date Input für mobile Geräte (iOS/Android)
  if (isMobile) {
    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none z-10">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
        </div>
        <input
          type="date"
          value={formatDateForInput(value)}
          onChange={handleNativeDateChange}
          disabled={disabled}
          className={cn(
            "block w-full max-w-full h-11 py-2 text-base rounded-lg border bg-white text-left",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all",
            !value && "text-gray-500",
            // Native Icon verstecken - nur unser Icon links soll sichtbar sein
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
            textAlign: "left",
            direction: "ltr",
            paddingLeft: "2.5rem",
            paddingRight: "1rem",
          } as React.CSSProperties}
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

  // Benutzerdefinierter Kalender für Desktop
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none z-10">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal bg-gray-50 hover:bg-gray-100 focus-visible:ring-[#D08945] focus-visible:border-[#D08945] ps-9",
              !value && "text-gray-500",
              className
            )}
            style={{
              borderColor: "rgba(209, 213, 219, 1)",
            }}
          >
            {value ? format(value, "PPP", { locale: de }) : <span>{placeholder}</span>}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 md:p-3 bg-white" 
        align="center"
        collisionPadding={{ bottom: 80 }}
        sideOffset={5}
      >
        {/* Header with month/year selectors and navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-7 w-7 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4 md:h-3.5 md:w-3.5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2">
            {/* Month Dropdown */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="text-xs font-medium px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors cursor-pointer"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            
            {/* Year Dropdown */}
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="text-xs font-medium px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors cursor-pointer"
            >
              {Array.from({ length: 2028 - new Date().getFullYear() + 1 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <button
            type="button"
            onClick={handleNextMonth}
            className="h-7 w-7 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <ChevronRight className="h-4 w-4 md:h-3.5 md:w-3.5 text-gray-600" />
          </button>
        </div>
        
        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="h-8 w-8 flex items-center justify-center text-[11px] font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </PopoverContent>
    </Popover>
  );
}

