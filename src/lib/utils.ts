import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
});

export const fmtDate = (v: string | null | undefined) => (v ? dateFmt.format(new Date(v)) : "—");
export const fmtDateTime = (v: string | null | undefined) => (v ? dateTimeFmt.format(new Date(v)) : "—");

export function initials(name: string | null | undefined): string {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

/** YYYY-MM-DD for today (UTC) plus `offsetDays`. Request-time value for server components. */
export function isoDay(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from today (UTC) until an ISO date; negative when past. */
export function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`) - Date.parse(`${isoDay()}T00:00:00Z`)) / 86_400_000);
}

/** "Overdue 3 days", "Today", "Tomorrow", "In 5 days" or a date. */
export function relativeDue(isoDate: string): { label: string; overdue: boolean; soon: boolean } {
  const n = daysUntil(isoDate);
  if (n < 0) return { label: `Overdue ${-n} day${n === -1 ? "" : "s"}`, overdue: true, soon: false };
  if (n === 0) return { label: "Today", overdue: false, soon: true };
  if (n === 1) return { label: "Tomorrow", overdue: false, soon: true };
  if (n <= 14) return { label: `In ${n} days`, overdue: false, soon: n <= 7 };
  if (n <= 60) return { label: `In ${Math.round(n / 7)} weeks`, overdue: false, soon: false };
  return { label: `In ${Math.round(n / 30)} months`, overdue: false, soon: false };
}
