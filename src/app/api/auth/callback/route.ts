import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import {
  completeOidcLogin,
  readOidcFlow,
  OIDC_FLOW_COOKIE,
} from "@/lib/auth/adapters/oidc";
import { provisionUser } from "@/lib/auth/provision";
import { createSession } from "@/lib/auth";

/** OIDC redirect target: exchange the code, provision the user, open a session. */
export async function GET(req: Request) {
  if (config.auth.mode !== "oidc") {
    return new NextResponse("OIDC sign-in is not enabled.", { status: 404 });
  }

  const jar = await cookies();
  const flowToken = jar.get(OIDC_FLOW_COOKIE)?.value;
  const flow = flowToken ? await readOidcFlow(flowToken) : null;
  jar.delete(OIDC_FLOW_COOKIE);

  if (!flow) {
    return NextResponse.redirect(new URL("/login?error=sso", config.appUrl));
  }

  try {
    const authUser = await completeOidcLogin(
      new URL(req.url),
      flow.codeVerifier,
      flow.state,
    );
    if (!authUser.externalId) {
      throw new Error("The identity provider returned no subject.");
    }
    const sessionUser = await provisionUser(authUser);
    await createSession(sessionUser);
    return NextResponse.redirect(new URL(flow.returnTo, config.appUrl));
  } catch {
    return NextResponse.redirect(new URL("/login?error=sso", config.appUrl));
  }
}
