import Link from "next/link";
import { acceptInvite } from "@/actions/groups";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { Button } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptInvite(token);

  if (result?.needsAuth) {
    const loginHref = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`;
    return (
      <div className="flex min-h-screen flex-col bg-hero-gradient">
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-center justify-center px-4 py-12 outline-none"
        >
          <div className="w-full max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <LogoLockup href="/" showTagline />
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
              <h1 className="text-2xl font-bold">You’re invited</h1>
              <p className="mt-3 text-sm text-brand-muted">
                Sign in to join this group. Invite links don’t send email
                themselves — use email & password (or Google/Apple) on the next
                screen if magic links are rate-limited.
              </p>
              <Button asChild className="mt-8 min-h-11 w-full bg-brand-blue hover:bg-brand-blue/90">
                <Link href={loginHref}>Continue to sign in</Link>
              </Button>
              <p className="mt-4 text-xs text-brand-muted">
                Prefer Create account with a password — it does not send email.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Invite error</h1>
          <p className="mt-2 text-muted-foreground">{result.error}</p>
          <Button asChild variant="outline" className="mt-6 min-h-11">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
