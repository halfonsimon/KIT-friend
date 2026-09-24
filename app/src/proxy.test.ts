import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { proxy } from "./proxy";

const AUTH_SECRET = "test-auth-secret";
const CRON_SECRET = "test-cron-secret";
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

async function sessionToken(salt: string) {
  return encode({ token: { sub: "user-1" }, secret: AUTH_SECRET, salt });
}

function request(
  url: string,
  { cookie, authorization }: { cookie?: { name: string; value: string }; authorization?: string } = {}
) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${cookie.name}=${cookie.value}`);
  if (authorization) headers.set("authorization", authorization);
  return new NextRequest(url, { headers });
}

// NextResponse.next() marks the response as passed through to the route.
function passedThrough(res: Response) {
  return res.headers.get("x-middleware-next") === "1";
}

function redirectTarget(res: Response) {
  const location = res.headers.get("location");
  return location ? new URL(location) : null;
}

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy: public paths", () => {
  it.each(["/", "/login", "/register", "/api/auth/session", "/api/auth/callback/google", "/api/register"])(
    "lets %s through without a session",
    async (path) => {
      const res = await proxy(request(`https://kit.example${path}`));
      expect(passedThrough(res)).toBe(true);
    }
  );
});

describe("proxy: protected paths", () => {
  it("redirects to /login with the original path as callbackUrl when there is no session", async () => {
    const res = await proxy(request("https://kit.example/contacts"));

    expect(passedThrough(res)).toBe(false);
    const target = redirectTarget(res);
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("callbackUrl")).toBe("/contacts");
  });

  it("lets a valid session through over HTTPS using the __Secure- cookie", async () => {
    const token = await sessionToken(SECURE_COOKIE);
    const res = await proxy(request("https://kit.example/contacts", { cookie: { name: SECURE_COOKIE, value: token } }));
    expect(passedThrough(res)).toBe(true);
  });

  it("lets a valid session through over HTTP using the plain cookie", async () => {
    const token = await sessionToken(PLAIN_COOKIE);
    const res = await proxy(request("http://localhost:3000/contacts", { cookie: { name: PLAIN_COOKIE, value: token } }));
    expect(passedThrough(res)).toBe(true);
  });

  it("rejects the plain cookie over HTTPS", async () => {
    const token = await sessionToken(PLAIN_COOKIE);
    const res = await proxy(request("https://kit.example/contacts", { cookie: { name: PLAIN_COOKIE, value: token } }));
    expect(redirectTarget(res)?.pathname).toBe("/login");
  });

  it("rejects the __Secure- cookie over HTTP", async () => {
    const token = await sessionToken(SECURE_COOKIE);
    const res = await proxy(request("http://localhost:3000/contacts", { cookie: { name: SECURE_COOKIE, value: token } }));
    expect(redirectTarget(res)?.pathname).toBe("/login");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await encode({ token: { sub: "user-1" }, secret: "other-secret", salt: SECURE_COOKIE });
    const res = await proxy(request("https://kit.example/contacts", { cookie: { name: SECURE_COOKIE, value: token } }));
    expect(redirectTarget(res)?.pathname).toBe("/login");
  });
});

describe("proxy: cron digest endpoint", () => {
  it("lets the correct CRON_SECRET bearer through without a session", async () => {
    const res = await proxy(
      request("https://kit.example/api/digest/send", { authorization: `Bearer ${CRON_SECRET}` })
    );
    expect(passedThrough(res)).toBe(true);
  });

  it("falls back to the session check for a wrong bearer", async () => {
    const res = await proxy(
      request("https://kit.example/api/digest/send", { authorization: "Bearer wrong" })
    );
    expect(redirectTarget(res)?.pathname).toBe("/login");
  });

  it("falls back to the session check when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await proxy(
      request("https://kit.example/api/digest/send", { authorization: "Bearer " })
    );
    expect(redirectTarget(res)?.pathname).toBe("/login");
  });

  it("still lets a signed-in user through (the Send Digest button)", async () => {
    const token = await sessionToken(SECURE_COOKIE);
    const res = await proxy(
      request("https://kit.example/api/digest/send?test=true", { cookie: { name: SECURE_COOKIE, value: token } })
    );
    expect(passedThrough(res)).toBe(true);
  });
});
