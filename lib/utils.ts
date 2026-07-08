import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { isToday, format } from "date-fns";
import { de } from "date-fns/locale";

export const parseTerminStartDate = (dateStr: string): Date | null => {
  const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null
}

export const parseTerminEndDate = (dateStr: string): Date | null => {
  if (/^ab\s/i.test(dateStr.trim())) return new Date(9999, 11, 31)
  const all = [...dateStr.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)]
  if (!all.length) return null
  const last = all[all.length - 1]
  return new Date(+last[3], +last[2] - 1, +last[1])
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}T`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? "Std." : "Std."}`;
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "Min." : "Min."}`;
  }
  if (seconds > 0) {
    return `${seconds} s`;
  }
  return "Jetzt";
}

export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  return format(date, "dd.MM.yy", { locale: de });
}


