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

export function DatePicker({
  value,
  onChange,
  placeholder = "Datum auswählen",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(value ? value.getMonth() : new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(value ? value.getFullYear() : new Date().getFullYear());

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
              "w-full justify-start text-left font-normal bg-gray-50 border-gray-300 hover:bg-gray-100 focus-visible:ring-[#D08945] focus-visible:border-[#D08945] ps-9",
              !value && "text-gray-500",
              className
            )}
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

