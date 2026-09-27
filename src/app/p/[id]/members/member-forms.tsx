"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, NativeSelect } from "@/components/ui/input";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { createInvite, setMemberRole } from "./actions";
import type { FormState } from "@/app/auth/actions";
import type { SideRole } from "@/lib/types";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export function RoleForm({ partnershipId, sideId, userId, role, canSign }: {
  partnershipId: string; sideId: string; userId: string; role: SideRole; canSign: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(setMemberRole, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="partnership_id" value={partnershipId} />
      <input type="hidden" name="side_id" value={sideId} />
      <input type="hidden" name="user_id" value={userId} />
      <NativeSelect name="role" defaultValue={role} className="h-8 w-28" aria-label="Role">
        <option value="owner">Owner</option>
        <option value="member">Member</option>
        <option value="viewer">Viewer</option>
      </NativeSelect>
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" name="can_sign" defaultChecked={canSign} className="size-3.5" /> Signer
      </label>
      <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state.message && <span className="text-xs text-success">{state.message}</span>}
    </form>
  );
}

export function NewInviteForm({ partnershipId, sideId, meetings }: {
  partnershipId: string; sideId: string; meetings: { id: string; title: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(createInvite, {});
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <input type="hidden" name="partnership_id" value={partnershipId} />
      <input type="hidden" name="side_id" value={sideId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`role-${sideId}`} className="text-xs">Joins as</Label>
        <NativeSelect id={`role-${sideId}`} name="role" defaultValue="member" className="h-8">
          <option value="member">Member</option>
          <option value="viewer">Viewer (read-only)</option>
          <option value="owner">Owner</option>
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`meeting-${sideId}`} className="text-xs">Also add to meeting</Label>
        <NativeSelect id={`meeting-${sideId}`} name="meeting_id" defaultValue="" className="h-8">
          <option value="">No meeting</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </NativeSelect>
      </div>
      <label className="flex h-8 items-center gap-1.5 text-xs">
        <input type="checkbox" name="can_sign" className="size-3.5" /> Can sign
      </label>
      <SubmitButton size="sm">New invite link</SubmitButton>
      <div className="sm:col-span-4">
        <FormMessage error={state.error} />
      </div>
    </form>
  );
}
