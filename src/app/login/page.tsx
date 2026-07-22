import { LogoLockup } from "@/components/brand/logo-lockup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { mapAuthServiceError } from "@/lib/auth/email";

const AUTH_ERRORS: Record<string, string> = {
  auth: "Sign-in failed. The link may have expired — try again with SSO or a new magic link.",
  missing_code: "Invalid sign-in link. Please try again with SSO or request a new magic link.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
    message?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";
  const inviteContext = redirectTo.startsWith("/invite/");
  const rawMessage = params.message;
  const errorMessage =
    (rawMessage ? mapAuthServiceError(rawMessage) : null) ??
    (params.error ? AUTH_ERRORS[params.error] ?? "Sign-in failed." : null);

  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4 py-12 outline-none"
      >
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <LogoLockup href="/" showTagline />
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">
                {inviteContext ? "Join your group" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-brand-muted">
                {inviteContext
                  ? "Prefer Google or Apple if magic-link email is rate-limited. No password needed."
                  : "Sign in with Google, Apple, or a magic link — no password needed."}
              </p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <LoginForm
              redirectTo={redirectTo}
              initialEmail={params.email ?? ""}
              inviteContext={inviteContext}
            />
          </div>

          <p className="mt-6 text-center text-xs text-brand-muted">
            By signing in you agree to fair splits and fewer awkward money chats.
          </p>
        </div>
      </main>
    </div>
  );
}
