import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const APP_TIMEZONE = "Africa/Lagos"; // UTC+1 (WAT)

export function parseDate(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === "number") return new Date(date);
  if (typeof date === "string") {
    const s = date.trim();
    if (/^\d+$/.test(s)) return new Date(Number(s));
    if (s.includes(" ") && !s.includes("T") && !s.includes("Z")) {
      return new Date(s.replace(" ", "T") + "Z");
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(date: Date | string | number | null | undefined): string {
  const d = parseDate(date);
  if (!d) return "N/A";
  return d.toLocaleDateString("en-NG", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  const d = parseDate(date);
  if (!d) return "N/A";
  return d.toLocaleString("en-NG", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
