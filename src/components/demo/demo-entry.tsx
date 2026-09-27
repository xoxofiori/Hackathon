"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_PERSONAS } from "@/lib/setup/demo-ids";
import { useDemo } from "./demo-provider";

export function DemoEntryButtons() {
  const { setPersona } = useDemo();
  const router = useRouter();
  return (
    <div className="mt-5 flex flex-col gap-3">
      {DEMO_PERSONAS.map((p) => (
        <Button
          key={p.key}
          variant="outline"
          className="h-auto w-full justify-start gap-3 py-3 text-left whitespace-normal"
          onClick={() => {
            setPersona(p.key as "maya" | "luca");
            router.push("/demo");
          }}
        >
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="flex flex-col">
            <span className="font-medium">Enter demo as {p.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{p.subtitle}</span>
          </span>
          <ArrowRight className="ml-auto" />
        </Button>
      ))}
    </div>
  );
}
