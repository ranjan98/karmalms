import type { Metadata } from "next";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: config.brand.name,
  description: "Open-source LMS for corporate training.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Brand color is injected as a CSS variable — themeable without a fork. */}
      <body style={{ ["--brand" as string]: config.brand.primaryColor }}>
        {children}
      </body>
    </html>
  );
}
