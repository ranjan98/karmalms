import type { Metadata } from "next";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: config.brand.name,
  description: "Open-source LMS for corporate training.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const branding = await getBranding(user?.orgId);

  // Apply the company's primary color over the theme tokens. The color is
  // hex-validated in getBranding, so inlining it here is safe.
  const brandCss = `:root,.dark{--primary:${branding.primaryColor};--ring:${branding.primaryColor};--sidebar-primary:${branding.primaryColor};}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
