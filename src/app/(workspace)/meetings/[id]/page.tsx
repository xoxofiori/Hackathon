import type { Metadata } from "next";
import { MeetingPage } from "@/components/meetings/meeting-page";

export const metadata: Metadata = { title: "Meeting notes" };

export default async function MeetingNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingPage id={id} />;
}
