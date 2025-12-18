import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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


