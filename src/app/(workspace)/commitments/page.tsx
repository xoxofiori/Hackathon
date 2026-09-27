import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommitmentsView } from "@/components/demo/demo-app";

export const metadata: Metadata = { title: "Commitments" };

export default function CommitmentsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Commitments</h1>
          <p className="mt-1 text-muted-foreground">Everything both sides have agreed, signed or are still working out.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/demo">Open the sign-off room <ArrowRight /></Link>
        </Button>
      </div>
      <CommitmentsView />
    </div>
  );
}
