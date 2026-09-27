import { cn, initials } from "@/lib/utils";

export function Avatar({ name, color, className }: { name: string | null | undefined; color?: string | null; className?: string }) {
  return (
    <span
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", className)}
      style={{ backgroundColor: color ?? "var(--primary)" }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
