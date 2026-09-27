import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/data/session";
import { profileDefaults } from "@/lib/data/profile";
import { ProfileForm } from "@/app/onboarding/profile-form";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireUser("/profile");
  const defaults = await profileDefaults(supabase, user.id, profile);
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaults={defaults} next="/profile" mode="edit" />
        </CardContent>
      </Card>
    </main>
  );
}
