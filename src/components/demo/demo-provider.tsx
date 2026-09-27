"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DemoRuleError } from "@/lib/demo/engine";
import { initialDemoState } from "@/lib/demo/sample-state";
import type { DemoState, PersonaKey } from "@/lib/demo/types";

const STATE_KEY = "accord-demo-state-v1";
const PERSONA_KEY = "accord-demo-persona";

interface DemoContextValue {
  ready: boolean;
  state: DemoState;
  persona: PersonaKey;
  setPersona: (p: PersonaKey) => void;
  /** Apply an engine action; returns an error message instead of throwing. */
  act: (fn: (s: DemoState, persona: PersonaKey) => DemoState, success?: string) => string | null;
  setState: (fn: (s: DemoState) => DemoState) => void;
  reset: () => void;
  notice: { text: string; tone: "ok" | "error" } | null;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the demo still works in memory.
  }
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<DemoState>(() => initialDemoState());
  const [persona, setPersonaRaw] = useState<PersonaKey>("maya");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<DemoContextValue["notice"]>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest state, so back-to-back updates (e.g. a scan finishing just before a click) never overwrite each other.
  const latest = useRef(state);
  const commit = useCallback((next: DemoState) => {
    latest.current = next;
    write(STATE_KEY, next);
    setStateRaw(next);
  }, []);

  // Load saved state after mount (the server render always uses the fresh sample).
  useEffect(() => {
    const saved = read<DemoState>(STATE_KEY);
    const savedPersona = (() => {
      try {
        return window.localStorage.getItem(PERSONA_KEY);
      } catch {
        return null;
      }
    })();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrating from browser storage */
    // Older saves keep their sign-offs and gain whatever the sample added since (meeting library, tasks).
    const version = (saved as { schema?: number } | null)?.schema;
    const restored: DemoState | null =
      version === 3 ? saved
      : version === 1 || version === 2
        ? { ...initialDemoState(), ...saved!, ...(version === 1 ? { library: initialDemoState().library } : {}), schema: 3, tasks: initialDemoState().tasks }
        : null;
    if (restored) {
      latest.current = restored;
      setStateRaw(restored);
    }
    if (savedPersona === "maya" || savedPersona === "luca") setPersonaRaw(savedPersona);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Keep other tabs in sync (e.g. Maya in one tab, Luca in another).
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY && e.newValue) {
        latest.current = JSON.parse(e.newValue) as DemoState;
        setStateRaw(latest.current);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const flash = useCallback((text: string, tone: "ok" | "error") => {
    setNotice({ text, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  const setState = useCallback((fn: (s: DemoState) => DemoState) => commit(fn(latest.current)), [commit]);

  const act = useCallback<DemoContextValue["act"]>((fn, success) => {
    try {
      commit(fn(latest.current, persona));
      if (success) flash(success, "ok");
      return null;
    } catch (err) {
      const message = err instanceof DemoRuleError ? err.message : "Something went wrong.";
      flash(message, "error");
      return message;
    }
  }, [persona, flash, commit]);

  const setPersona = useCallback((p: PersonaKey) => {
    setPersonaRaw(p);
    write(PERSONA_KEY, p);
  }, []);

  const reset = useCallback(() => {
    commit(initialDemoState());
    flash("Demo reset to the original sample.", "ok");
  }, [flash, commit]);

  const value = useMemo(
    () => ({ ready, state, persona, setPersona, act, setState, reset, notice }),
    [ready, state, persona, setPersona, act, setState, reset, notice],
  );
  return (
    <DemoContext.Provider value={value}>
      {children}
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg ${
            notice.tone === "error" ? "bg-destructive text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {notice.text}
        </div>
      )}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
