import type { Metadata } from "next";
import { ApprovalBoard } from "@/components/approvals/approval-board";

export const metadata: Metadata = { title: "Commitments" };

export default function CommitmentsPage() {
  return <ApprovalBoard scope="all" />;
}
