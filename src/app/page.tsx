import Link from "next/link";
import { ArrowRight, FileSignature, GitBranch, HelpCircle, ListChecks, Lock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { DEMO_PERSONAS } from "@/lib/setup/demo-ids";
import { getSession } from "@/lib/data/session";
import { demoSignIn } from "@/app/auth/actions";
import { WorkspaceShell } from "@/components/workspace/shell";
import { HomeDashboard } from "@/components/workspace/home-dashboard";
import { isDemoMode } from "@/lib/mode";

const FEATURES = [
  { icon: HelpCircle, title: "Catches ambiguity live", body: "Soft asks, hedged yeses, \"by spring\", \"we'll handle it\" — flagged as neutral questions before anyone signs." },
  { icon: FileSignature, title: "Signed commitments", body: "Every agreement is signed by each side's authorized signer on the exact same wording. Changes need a new signature." },
  { icon: ListChecks, title: "Tasks and timelines", body: "Commitments become tasks per person, per side and for the partnership, with slips and overdue items tracked." },
  { icon: Target, title: "Goals that get answered", body: "Each side sets private goals and must-get answers before the call, and sees them checked off live." },
  { icon: Lock, title: "Private where it matters", body: "Breakouts, internal goals and candid notes stay with your side — enforced in the database, not just the UI." },
  { icon: GitBranch, title: "Works inside one company", body: "A side can be a company, a branch or a team, so it fits Sales × Product as well as brand × studio." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demo = isDemoMode();
  // Demo mode: the home dashboard is the landing page.
  if (demo) {
    return (
      <WorkspaceShell>
        <HomeDashboard />
      </WorkspaceShell>
    );
  }
  const { user } = await getSession();
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-12 lg:grid-cols-[1.2fr_1fr] lg:pt-24">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Partnership meeting intelligence</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Know exactly who agreed to what — and whether it happened.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            Accord listens to calls between two companies, branches or teams, flags what might be misunderstood, and
            turns every agreement into a commitment both sides sign. No more digging through emails.
          </p>
          {user && (
            <div>
              <Button asChild size="lg">
                <Link href="/partnerships">
                  Go to your partnerships <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Try the live demo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wildframe Media × Aurel Watches, negotiating a Season 3 sponsorship. Sign in as either side and see what
            each one can — and can&apos;t — see.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            {DEMO_PERSONAS.map((p) => (
              <form key={p.key} action={demoSignIn}>
                <input type="hidden" name="persona" value={p.key} />
                <SubmitButton
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-3 text-left whitespace-normal"
                  pendingText="Signing in…"
                >
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="flex flex-col">
                    <span className="font-medium">Enter demo as {p.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{p.subtitle}</span>
                  </span>
                  <ArrowRight className="ml-auto" />
                </SubmitButton>
              </form>
            ))}
          </div>
          <div className="mt-4">
            <FormMessage error={error} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Or <Link href="/signup" className="underline">create your own account</Link> and start a partnership.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <f.icon className="size-5 text-muted-foreground" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
