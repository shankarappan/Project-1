"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "app_error_boundary",
        digest: error.digest ?? null,
        name: error.name,
        ts: new Date().toISOString(),
      })
    );
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <LogoLockup href="/" size="sm" />
      <h1 className="mt-8 text-2xl font-bold text-brand-navy">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-brand-muted">
        We hit an unexpected error. Your data should be safe — try again, or
        head back to the dashboard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="min-h-11 bg-brand-blue hover:bg-brand-blue/90">
          Try again
        </Button>
        <Button variant="outline" asChild className="min-h-11">
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-brand-muted" aria-live="polite">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
