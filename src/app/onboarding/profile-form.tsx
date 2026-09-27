"use client";

import { useActionState, useMemo } from "react";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { saveProfile } from "./actions";
import type { FormState } from "@/app/auth/actions";

export interface ProfileDefaults {
  full_name: string;
  title: string;
  job_role: string;
  languages: string;
  timezone: string;
  communication_notes: string;
  org_name: string;
  team_name: string;
}

export function ProfileForm({ defaults, next, mode }: { defaults: ProfileDefaults; next: string; mode: "onboard" | "edit" }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {});
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC"];
    }
  }, []);
  const tz = defaults.timezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={defaults.full_name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaults.title} placeholder="Partnerships Lead" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="job_role">Role / function</Label>
        <Input id="job_role" name="job_role" defaultValue={defaults.job_role} placeholder="Partnerships, Legal, Product…" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org_name">Organization</Label>
        <Input id="org_name" name="org_name" defaultValue={defaults.org_name} placeholder="Wildframe Media" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="team_name">Team, branch or department (optional)</Label>
        <Input id="team_name" name="team_name" defaultValue={defaults.team_name} placeholder="Sales EMEA" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="languages">Languages</Label>
        <Input id="languages" name="languages" defaultValue={defaults.languages} placeholder="en, fr, de" />
        <p className="text-xs text-muted-foreground">Language codes, comma-separated. The first is your preferred language.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Time zone</Label>
        <NativeSelect id="timezone" name="timezone" defaultValue={tz}>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="communication_notes">How you like to work (optional)</Label>
        <Textarea
          id="communication_notes"
          name="communication_notes"
          defaultValue={defaults.communication_notes}
          placeholder="e.g. Prefers a written recap after calls. Decisions over budget need sign-off from my director."
        />
        <p className="text-xs text-muted-foreground">Shared with partners you work with, and used to phrase clarifications well.</p>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage error={state.error} message={state.message} />
        <SubmitButton className="sm:w-fit" pendingText="Saving…">
          {mode === "onboard" ? "Continue" : "Save profile"}
        </SubmitButton>
      </div>
    </form>
  );
}
