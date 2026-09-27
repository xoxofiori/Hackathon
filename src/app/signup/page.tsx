import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, safeNext } from "@/lib/data/session";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { user } = await getSession();
  if (user) redirect(next);
  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Your own login — never shared. You&apos;ll set up your profile next.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
