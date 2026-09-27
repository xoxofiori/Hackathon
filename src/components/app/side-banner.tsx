import { Eye, PenLine, ShieldCheck } from "lucide-react";
import { sideName, type PartnershipContext } from "@/lib/data/partnership";

/** Always-visible reminder of which side the current user is acting for. */
export function SideBanner({ ctx }: { ctx: PartnershipContext }) {
  const { mySide, myRole, canSign } = ctx;
  return (
    <div className="border-b" style={{ backgroundColor: `color-mix(in oklch, ${mySide.color} 10%, var(--background))` }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="size-3 rounded-full ring-2 ring-white/60" style={{ backgroundColor: mySide.color }} />
          You&apos;re on {sideName(mySide)}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {myRole === "owner" ? <ShieldCheck className="size-3.5" /> : myRole === "viewer" ? <Eye className="size-3.5" /> : null}
          {myRole === "owner" ? "Side owner" : myRole === "viewer" ? "Viewer (read-only)" : "Member"}
        </span>
        {canSign && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <PenLine className="size-3.5" /> Authorized signer
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">Private notes and goals are visible only to your side.</span>
      </div>
    </div>
  );
}
