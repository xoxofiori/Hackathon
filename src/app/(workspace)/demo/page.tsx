import type { Metadata } from "next";
import { ApprovalBoard } from "@/components/approvals/approval-board";

export const metadata: Metadata = { title: "Analysis" };

/** Analysis for the sample meeting: what to approve or push back on, and what to do next. */
export default function AnalysisPage() {
  return <ApprovalBoard scope="meeting" />;
}
