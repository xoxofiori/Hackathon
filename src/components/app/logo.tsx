import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M9 21.5 13.2 10h1.9l4.2 11.5M10.6 17.4h7.2" className="stroke-primary-foreground" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22.5" cy="20.5" r="2.4" fill="#f59e0b" />
      </svg>
      <span>Accord</span>
    </Link>
  );
}
