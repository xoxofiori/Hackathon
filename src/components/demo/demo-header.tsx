"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import { useDemo } from "./demo-provider";
import type { PersonaKey } from "@/lib/demo/types";

export function PersonaToggle({ className, short = false }: { className?: string; short?: boolean }) {
  const { persona, setPersona } = useDemo();
  return (
    <div role="radiogroup" aria-label="View the demo as" className={cn("inline-flex rounded-lg border bg-muted p-0.5", className)}>
      {(Object.keys(DEMO_PEOPLE) as PersonaKey[]).map((key) => {
        const p = DEMO_PEOPLE[key];
        const active = persona === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            onClick={() => setPersona(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm transition-colors",
              active ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            title={`${p.name}, ${p.title} — ${SIDES[p.side].label}`}
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: SIDES[p.side].color }} />
            <span className={short ? "" : "sm:hidden"}>{p.name.split(" ")[0]}</span>
            {!short && <span className="hidden sm:inline">{p.name}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function DemoHeader() {
  const { reset } = useDemo();
  const path = usePathname();
  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Logo />
        <span
          className="hidden items-center gap-1 rounded-md bg-warning/20 px-2 py-0.5 text-xs font-medium md:inline-flex"
          title="Runs entirely in your browser with built-in sample data. Changes are saved on this device only."
        >
          <FlaskConical className="size-3" /> Demo mode
        </span>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">Home</Link>
          <Link href="/meetings" className="hidden rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:inline">Meetings</Link>
          {path === "/demo" && <span className="hidden rounded-md bg-accent px-2.5 py-1.5 font-medium sm:inline">Analysis &amp; sign-off</span>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">Viewing as</span>
          <PersonaToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset demo data"
            title="Reset demo data"
            onClick={() => {
              if (window.confirm("Reset the demo? Your sign-offs and notes in this browser will be cleared.")) reset();
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
    </header>
  );
}
