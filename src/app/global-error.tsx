"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        message: "global_error_boundary",
        digest: error.digest ?? null,
        name: error.name,
        ts: new Date().toISOString(),
      })
    );
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
          background: "#fafbfc",
          color: "#1c2534",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: "1.5rem", margin: 0 }}>
            Lets Split
          </p>
          <h1 style={{ marginTop: "1.5rem", fontSize: "1.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#70757a", maxWidth: 420 }}>
            Please try again. If the problem continues, refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: 44,
              minWidth: 44,
              padding: "0.65rem 1.25rem",
              borderRadius: 12,
              border: "none",
              background: "#4a69e2",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}