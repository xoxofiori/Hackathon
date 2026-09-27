import type { Metadata } from "next";
import { NewMeeting } from "@/components/meetings/new-meeting";

export const metadata: Metadata = { title: "New meeting" };

export default function NewMeetingPage() {
  return <NewMeeting />;
}
