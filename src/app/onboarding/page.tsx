import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, safeNext } from "@/lib/data/session";
import { profileDefaults } from "@/lib/data/profile";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { supabase, user, profile } = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${next}`)}`);
  if (profile?.onboarded_at) redirect(next);
  const defaults = await profileDefaults(supabase, user.id, profile);
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Set up your profile</CardTitle>
          <CardDescription>
            Partners see your name, title and how you like to work. Your organization and team decide which side you
            can represent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaults={defaults} next={next} mode="onboard" />
        </CardContent>
      </Card>
    </main>
  );
}
