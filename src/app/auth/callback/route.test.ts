import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
let latestSetAll:
  | ((cookies: { name: string; value: string; options?: object }[]) => void)
  | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (cookies: { name: string; value: string; options?: object }[]) => void;
      };
    }
  ) => {
    latestSetAll = options.cookies.setAll;
    return {
      auth: {
        exchangeCodeForSession: async (code: string) => {
          const result = await exchangeCodeForSession(code);
          if (!result?.error && latestSetAll) {
            latestSetAll([
              {
                name: "sb-access-token",
                value: "session-value",
                options: { path: "/" },
              },
            ]);
          }
          return result;
        },
      },
    };
  },
}));

import { GET } from "./route";

function makeRequest(url: string) {
  return {
    url,
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof GET>[0];
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    latestSetAll = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("rejects missing code", async () => {
    const res = await GET(makeRequest("http://localhost:3000/auth/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=missing_code"
    );
  });

  it("blocks open redirects after successful exchange", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(
      makeRequest(
        "http://localhost:3000/auth/callback?code=abc&redirect=%2F%2Fevil.com"
      )
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("honors safe redirect paths", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(
      makeRequest(
        "http://localhost:3000/auth/callback?code=abc&redirect=%2Fgroups%2F1"
      )
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/groups/1");
  });

  it("maps PKCE failures without exposing raw provider details", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: {
        message:
          "invalid request: both auth code and code verifier should be non-empty",
      },
    });
    const res = await GET(
      makeRequest("http://localhost:3000/auth/callback?code=abc&redirect=/groups/1")
    );
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=pkce"
    );
  });

  it("persists session cookies on the redirect response", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(
      makeRequest("http://localhost:3000/auth/callback?code=ok&redirect=/dashboard")
    );

    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    const setCookie = res.headers.getSetCookie();
    expect(setCookie.some((c) => c.includes("sb-access-token=session-value"))).toBe(
      true
    );
  });
});
