"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const HUB_TABS = [
  { slug: "", label: "Overview" },
  { slug: "members", label: "Members" },
] as const;

export function PartnershipNav({ id }: { id: string }) {
  const path = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Partnership sections">
      {HUB_TABS.map((t) => {
        const href = `/p/${id}${t.slug ? `/${t.slug}` : ""}`;
        const active = t.slug ? path.startsWith(href) : path === href;
        return (
          <Link
            key={t.slug}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
