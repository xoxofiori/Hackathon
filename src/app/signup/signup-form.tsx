"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/input";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { signUp, type FormState } from "@/app/auth/actions";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
