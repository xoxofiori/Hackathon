"use client";

import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import { useDemo } from "@/components/demo/demo-provider";
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
