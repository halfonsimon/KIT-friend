import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  pathname === "/login" ||
  pathname === "/register" ||
  pathname.startsWith("/api/auth") ||
  pathname === "/api/register";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Cron endpoint: require CRON_SECRET bearer token (skip normal auth)
  if (pathname === "/api/digest/send") {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
      if (bearer === cronSecret) {
        return NextResponse.next();
      }
    }
  }

  // Check for session token -- use explicit cookie name for Auth.js v5
  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    secureCookie: isSecure,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
