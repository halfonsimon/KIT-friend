import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) {
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
    // Fall through to normal JWT auth check below
  }

  // Allow register API
  if (pathname === "/api/register") {
    return NextResponse.next();
  }

  // Public pages: landing, login, register
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  // Everything else requires authentication
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
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
