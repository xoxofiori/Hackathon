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
