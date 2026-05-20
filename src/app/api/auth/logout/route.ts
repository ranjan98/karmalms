import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { destroySession } from "@/lib/auth";

/** Clears the session cookie and returns to the login page. */
export async function POST() {
  await destroySession();
  return NextResponse.redirect(new URL("/login", config.appUrl), {
    status: 303,
  });
}
