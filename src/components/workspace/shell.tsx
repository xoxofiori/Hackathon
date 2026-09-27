"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSignature, FlaskConical, Home, NotebookText, RotateCcw, Settings } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { PersonaToggle } from "@/components/demo/demo-header";
import { useDemo } from "@/components/demo/demo-provider";
import { Avatar } from "@/components/ui/avatar";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meetings", label: "Meetings", icon: NotebookText },
  { href: "/commitments", label: "Commitments", icon: FileSignature },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { persona, reset } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const side = SIDES[me.side];

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card px-4 py-5 md:flex">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-medium" title="Runs in your browser with built-in sample data">
            <FlaskConical className="size-3" /> Demo
          </span>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(path, href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2 text-sm transition-colors",
                isActive(path, href) ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-2xl border p-3" style={{ backgroundColor: `color-mix(in oklch, ${side.color} 8%, var(--card))` }}>
            <div className="flex items-center gap-2.5">
              <Avatar name={me.name} color={side.color} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{me.name}</p>
                <p className="truncate text-xs text-muted-foreground">{me.title} · {side.label}</p>
              </div>
            </div>
            <p className="mt-3 mb-1.5 text-[11px] text-muted-foreground">View as</p>
            <PersonaToggle short className="w-full [&>button]:flex-1 [&>button]:justify-center" />
          </div>
          <button
            onClick={() => {
              if (window.confirm("Reset the demo? Meetings you created, sign-offs and notes in this browser will be cleared.")) reset();
            }}
            className="flex items-center gap-2 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset demo data
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <PersonaToggle className="ml-auto" />
      </header>

      <main className="min-w-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(path, href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(path, href) ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            <Icon className="size-5" /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
