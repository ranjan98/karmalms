import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import {
  startOidcLogin,
  signOidcFlow,
  OIDC_FLOW_COOKIE,
} from "@/lib/auth/adapters/oidc";

function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

/** Starts the OIDC sign-in: stash PKCE state, redirect to the identity provider. */
export async function GET(req: Request) {
  if (config.auth.mode !== "oidc") {
    return new NextResponse("OIDC sign-in is not enabled.", { status: 404 });
  }

  const returnTo = safeReturnTo(
    new URL(req.url).searchParams.get("returnTo"),
  );
  const { authorizationUrl, codeVerifier, state } = await startOidcLogin();
  const flowToken = await signOidcFlow({ codeVerifier, state, returnTo });

  const jar = await cookies();
  jar.set(OIDC_FLOW_COOKIE, flowToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizationUrl);
}
