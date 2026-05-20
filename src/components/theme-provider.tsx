"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light/dark theme provider. Defaults to the visitor's OS preference and
 * persists their explicit choice. Toggles the `dark` class on <html>, which
 * the theme tokens in globals.css key off.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
