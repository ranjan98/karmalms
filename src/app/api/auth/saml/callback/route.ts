import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { completeSamlLogin } from "@/lib/auth/adapters/saml";
import { provisionUser } from "@/lib/auth/provision";
import { createSession } from "@/lib/auth";

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

/** SAML ACS — the IdP POSTs its signed assertion here after authentication. */
export async function POST(req: Request) {
  if (config.auth.mode !== "saml") {
    return new NextResponse("SAML sign-in is not enabled.", { status: 404 });
  }

  const form = await req.formData();
  const samlResponse = String(form.get("SAMLResponse") ?? "");
  const returnTo = safeReturnTo(String(form.get("RelayState") ?? ""));
  if (!samlResponse) {
    return new NextResponse("Missing SAML response.", { status: 400 });
  }

  try {
    const authUser = await completeSamlLogin(samlResponse);
    if (!authUser.externalId) {
      throw new Error("The SAML assertion had no subject.");
    }
    const sessionUser = await provisionUser(authUser);
    await createSession(sessionUser);
    return NextResponse.redirect(new URL(returnTo, config.appUrl));
  } catch {
    return NextResponse.redirect(new URL("/login?error=sso", config.appUrl));
  }
}
