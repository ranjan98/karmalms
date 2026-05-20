import { cn } from "@/lib/utils";
import type { OrgBranding } from "@/lib/branding";

/**
 * Company logo. Renders both the light and dark variants and shows the right
 * one via CSS — so it stays correct through SSR with no theme-flash.
 */
export function Logo({
  branding,
  alt,
  className,
}: {
  branding: OrgBranding;
  alt: string;
  className?: string;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branding.logoLight}
        alt={alt}
        className={cn("block dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branding.logoDark}
        alt={alt}
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
