import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";
import { rateLimit } from "@/lib/rate-limit";

/** Data-API surfaces that are rate-limited per client. */
const RATE_LIMITED = ["/api/v1", "/api/scim", "/api/tutor"];

/** Paths reachable without a session. */
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/health",
  "/api/assets",
  "/api/cron",
  "/api/v1",
  "/api/scim",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Gates every page behind a valid session. The check is cookie-only (no DB),
 * so it runs safely on the edge runtime.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit the data API: 120 requests/minute per client IP.
  if (
    RATE_LIMITED.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    if (!rateLimit(`api:${ip}`, 120, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?returnTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next internals and files with an extension
  // (e.g. /logo.svg, /favicon.ico).
  matcher: ["/((?!_next/|.*\\.).*)"],
};
