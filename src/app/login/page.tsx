import { LogoLockup } from "@/components/brand/logo-lockup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthErrorMessage } from "@/lib/auth/callback-errors";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params.redirect ?? "/dashboard");
  // Prefer mapped codes; never trust raw provider messages in the query string.
  const errorMessage = params.error
    ? getAuthErrorMessage(params.error, params.message)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <LogoLockup href="/" showTagline />
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="mt-2 text-sm text-brand-muted">
                Sign in with a magic link — no password needed.
              </p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="mt-6 text-center text-xs text-brand-muted">
            By signing in you agree to fair splits and fewer awkward money chats.
          </p>
        </div>
      </div>
    </div>
  );
}
