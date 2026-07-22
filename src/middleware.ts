import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { securityHeaders } from "@/lib/security/csp";

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProduction = process.env.NODE_ENV === "production";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const headers = securityHeaders({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nonce,
    isProduction,
  });

  // Next.js reads CSP from the *request* to stamp nonces onto framework scripts.
  requestHeaders.set(
    "Content-Security-Policy",
    headers["Content-Security-Policy"]
  );

  const response = await updateSession(
    new NextRequest(request, { headers: requestHeaders })
  );

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
      Skip static assets, images, and Next internals.
      Public pages without a session cookie skip auth in updateSession.
    */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
