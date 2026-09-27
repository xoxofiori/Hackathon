import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/shell";
import { isDemoMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

/** Home-style workspace (meetings, commitments, settings). Demo mode only for now. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoMode()) redirect("/partnerships");
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
