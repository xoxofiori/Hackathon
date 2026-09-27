import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoApp } from "@/components/demo/demo-app";
import { isDemoMode } from "@/lib/mode";

export const metadata: Metadata = { title: "Analysis & sign-off" };
// The mode is read at request time, so one build can run in either mode.
export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!isDemoMode()) redirect("/");
  const { tab } = await searchParams;
  return <DemoApp initialTab={tab} />;
}
