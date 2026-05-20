import { redirect } from "next/navigation";

/**
 * The root path has no page of its own — signed-in users go to the dashboard,
 * everyone else is bounced to /login by the middleware.
 */
export default function Home() {
  redirect("/dashboard");
}
