import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Setup", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Database setup</CardTitle>
          <CardDescription>
            Applies <code>supabase/schema.sql</code> to <code>POSTGRES_URL</code> and seeds the Wildframe × Aurel demo.
            Safe to run more than once. Alternative: paste <code>supabase/schema.sql</code> into the Supabase SQL editor,
            then run <code>npm run db:setup</code> locally for the demo data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {env.setupSecret ? (
            <SetupForm />
          ) : (
            <p className="text-sm text-muted-foreground">Setup is disabled. Set <code>SETUP_SECRET</code> in the environment to enable this page.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
