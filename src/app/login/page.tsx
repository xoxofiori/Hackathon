import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, safeNext } from "@/lib/data/session";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const { user } = await getSession();
  if (user) redirect(next);
  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Sign in to Accord</CardTitle>
          <CardDescription>Each person has their own account. Your side is set by the partnerships you join.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForms next={next} initialError={sp.error} />
        </CardContent>
      </Card>
    </main>
  );
}
