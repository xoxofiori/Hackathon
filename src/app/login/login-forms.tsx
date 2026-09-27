"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { sendMagicLink, signIn, signInWithProvider, type FormState } from "@/app/auth/actions";

export function LoginForms({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useActionState<FormState, FormData>(signIn, { error: initialError });
  const [mlState, mlAction] = useActionState<FormState, FormData>(sendMagicLink, {});
  const state = mode === "password" ? pwState : mlState;

  return (
    <div className="flex flex-col gap-5">
      <form action={mode === "password" ? pwAction : mlAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {mode === "password" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        )}
        <FormMessage error={state.error} message={state.message} />
        <SubmitButton pendingText={mode === "password" ? "Signing in…" : "Sending…"}>
          {mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </SubmitButton>
        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "magic" : "password")}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form action={signInWithProvider} className="grid grid-cols-2 gap-2">
        <input type="hidden" name="next" value={next} />
        <Button variant="outline" name="provider" value="google">Google</Button>
        <Button variant="outline" name="provider" value="azure">Microsoft</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
