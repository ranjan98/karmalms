import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { startSamlLogin } from "@/lib/auth/adapters/saml";

function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

/** Starts SAML SP-initiated SSO — redirects the user to the identity provider. */
export async function GET(req: Request) {
  if (config.auth.mode !== "saml") {
    return new NextResponse("SAML sign-in is not enabled.", { status: 404 });
  }

  const returnTo = safeReturnTo(
    new URL(req.url).searchParams.get("returnTo"),
  );
  return NextResponse.redirect(await startSamlLogin(returnTo));
}
