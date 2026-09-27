"use client";

import { useActionState } from "react";
import { Input, Label } from "@/components/ui/input";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { runSetup } from "./actions";
import type { FormState } from "@/app/auth/actions";

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(runSetup, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="secret">Setup secret</Label>
        <Input id="secret" name="secret" type="password" autoComplete="off" required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="schema_only" /> Apply schema only (don&apos;t seed demo data)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="reset" /> Reset: wipe all partnership data first, then re-seed
      </label>
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pendingText="Running setup… (about 10 seconds)">Run setup</SubmitButton>
    </form>
  );
}
