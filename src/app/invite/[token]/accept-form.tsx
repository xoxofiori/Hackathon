"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { acceptInvite } from "./actions";
import type { FormState } from "@/app/auth/actions";

export function AcceptForm({ token, claim, orgs, pendingOrg, sideLabel }: {
  token: string; claim: boolean; orgs: { id: string; name: string }[]; pendingOrg: string; sideLabel: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, {});
  const match = orgs.find((o) => o.name.toLowerCase() === pendingOrg.toLowerCase());
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {claim && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Which organization are you representing?</legend>
          {orgs.map((o) => (
            <label key={o.id} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
              <input type="radio" name="org" value={o.id} defaultChecked={o.id === (match?.id ?? orgs[0]?.id)} /> {o.name}
            </label>
          ))}
          <label className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
            <input type="radio" name="org" value="new" defaultChecked={orgs.length === 0} /> Create “{pendingOrg}”
          </label>
        </fieldset>
      )}
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Joining…">
        {claim ? `Claim ${sideLabel}` : `Join ${sideLabel}`}
      </SubmitButton>
    </form>
  );
}
