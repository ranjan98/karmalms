import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { verifyPortalToken } from "@/lib/auth/adapters/trusted-jwt";
import { provisionUser } from "@/lib/auth/provision";
import { createSession } from "@/lib/auth";

function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

/**
 * Trusted-JWT sign-in. The company portal sends an already-authenticated user
 * here with a signed token (query param, Authorization header, or a
 * `portal_token` cookie). KarmaLMS verifies it, provisions the user, and
 * issues its own session — "appending" KarmaLMS to the portal session.
 */
export async function GET(req: Request) {
  if (config.auth.mode !== "trusted-jwt") {
    return new NextResponse("Trusted-JWT sign-in is not enabled.", {
      status: 404,
    });
  }

  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  const header = req.headers.get("authorization");
  const cookieToken = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)portal_token=([^;]+)/)?.[1];
  const token =
    url.searchParams.get("token") ??
    (header?.startsWith("Bearer ") ? header.slice(7) : null) ??
    cookieToken ??
    null;

  if (!token) {
    return new NextResponse("No portal token supplied.", { status: 401 });
  }

  const authUser = await verifyPortalToken(token);
  if (!authUser || !authUser.externalId) {
    return new NextResponse("Invalid or expired portal token.", {
      status: 401,
    });
  }

  const sessionUser = await provisionUser(authUser);
  await createSession(sessionUser);
  return NextResponse.redirect(new URL(returnTo, config.appUrl));
}
