import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { securityHeaders } from "@/lib/security/csp";

function applySecurityHeaders(response: NextResponse) {
  const headers = securityHeaders({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    isProduction: process.env.NODE_ENV === "production",
  });

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
      Skip static assets, images, and Next internals.
      Public pages without a session cookie skip auth in updateSession.
    */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
