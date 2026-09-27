"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FileSignature, FlaskConical, Home, NotebookText, Plus, RotateCcw, Settings } from "lucide-react";
import { createGroup } from "@/lib/meetings/groups";
import { Logo } from "@/components/app/logo";
import { PersonaToggle } from "./persona-toggle";
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

// The Analysis page belongs to a meeting, so it highlights Meetings.
const isActive = (path: string, href: string) =>
  href === "/" ? path === "/" : path.startsWith(href) || (href === "/meetings" && path.startsWith("/demo"));

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
        <SidebarGroups path={path} />
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

/** Groups in the sidebar: click one to see its meetings; "+" creates a group in one step. */
function SidebarGroups({ path }: { path: string }) {
  const { state, setState } = useDemo();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const counts = new Map<string, number>();
  for (const m of state.library) if (m.groupId) counts.set(m.groupId, (counts.get(m.groupId) ?? 0) + 1);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let id = "";
    setState((s) => {
      const r = createGroup(s, name);
      id = r.group.id;
      return r.state;
    });
    setName("");
    setAdding(false);
    router.push(`/groups/${id}`);
  };

  return (
    <section aria-labelledby="groups-title" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-3.5">
        <h2 id="groups-title" className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Groups</h2>
        <button onClick={() => setAdding(!adding)} aria-label="Create a group" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Plus className="size-3.5" />
        </button>
      </div>
      {adding && (
        <form onSubmit={add} className="mt-2 px-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name.trim() && setAdding(false)}
            placeholder="Group name, then Enter"
            aria-label="New group name"
            autoFocus
            className="h-8 w-full rounded-full border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </form>
      )}
      <ul className="mt-1.5 flex flex-col gap-0.5 overflow-y-auto">
        {state.groups.map((g) => {
          const href = `/groups/${g.id}`;
          const active = path === href;
          return (
            <li key={g.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={g.name}
                className={cn("flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-sm", active ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                <span className="text-xs tabular-nums opacity-70">{counts.get(g.id) ?? 0}</span>
              </Link>
            </li>
          );
        })}
        {state.groups.length === 0 && !adding && <li className="px-3.5 text-xs text-muted-foreground">No groups yet.</li>}
      </ul>
    </section>
  );
}
