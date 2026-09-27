import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoApp } from "@/components/demo/demo-app";
import { isDemoMode } from "@/lib/mode";

export const metadata: Metadata = { title: "Demo" };
// The mode is read at request time, so one build can run in either mode.
export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (!isDemoMode()) redirect("/");
  return <DemoApp />;
}
