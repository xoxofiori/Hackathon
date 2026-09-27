"use client";

import { useActionState, useState } from "react";
import { Building2, GitBranch } from "lucide-react";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { cn } from "@/lib/utils";
import { createPartnership } from "../actions";
import type { FormState } from "@/app/auth/actions";

export function NewPartnershipForm({ orgs }: { orgs: { id: string; name: string; team: string | null }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createPartnership, {});
  const [internal, setInternal] = useState(false);
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const org = orgs.find((o) => o.id === orgId);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { value: false, icon: Building2, title: "Two organizations", body: "e.g. a brand and a studio negotiating a sponsorship" },
          { value: true, icon: GitBranch, title: "Inside my organization", body: "e.g. two branches, departments or teams" },
        ].map((o) => (
          <button
            type="button"
            key={o.title}
            onClick={() => setInternal(o.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              internal === o.value ? "border-ring bg-accent ring-2 ring-ring/30" : "hover:bg-accent/50",
            )}
            aria-pressed={internal === o.value}
          >
            <o.icon className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block text-xs text-muted-foreground">{o.body}</span>
            </span>
          </button>
        ))}
      </div>
      <input type="hidden" name="internal" value={internal ? "on" : ""} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Partnership name</Label>
        <Input id="name" name="name" placeholder={internal ? "Sales EMEA × Product US — Q3 launch" : "Wildframe × Aurel — Season 3 sponsorship"} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">What is this partnership about? (optional)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Your side</legend>
          <div className="flex flex-col gap-2">
            <Label htmlFor="my_org">Organization</Label>
            <NativeSelect id="my_org" name="my_org" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="my_team">Team or branch {internal ? "" : "(optional)"}</Label>
            <Input id="my_team" name="my_team" defaultValue={org?.team ?? ""} required={internal} placeholder="Sales EMEA" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="my_label">Side name</Label>
            <Input id="my_label" name="my_label" defaultValue={internal ? "" : org?.name ?? ""} key={`${internal}-${orgId}`} required />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">The other side</legend>
          {internal ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="other_team">Team or branch in {org?.name ?? "your organization"}</Label>
              <Input id="other_team" name="other_team" placeholder="Product US" required />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="other_org">Organization</Label>
              <Input id="other_org" name="other_org" placeholder="Aurel Watches" required />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="other_label">Side name</Label>
            <Input id="other_label" name="other_label" placeholder={internal ? "Product US" : "Aurel Watches"} required />
          </div>
          <p className="text-xs text-muted-foreground">
            You&apos;ll get an invite link and QR code for their lead. They claim this side and invite their own teammates.
          </p>
        </fieldset>
      </div>

      <FormMessage error={state.error} />
      <SubmitButton className="sm:w-fit" pendingText="Creating…">Create partnership</SubmitButton>
    </form>
  );
}
