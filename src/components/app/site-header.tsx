import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/data/session";
import { signOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const { supabase, user, profile } = await getSession();
  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }
  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Logo />
        {user && (
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/partnerships" className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              Partnerships
            </Link>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/partnerships#notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
                aria-label={`${unread} unread notifications`}
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
                <Avatar name={profile?.full_name || user.email} className="size-7" />
                <span className="hidden text-sm sm:inline">{profile?.full_name || user.email}</span>
              </Link>
              <form action={signOut}>
                <Button variant="ghost" size="icon" aria-label="Sign out">
                  <LogOut />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
