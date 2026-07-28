"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wrapper um next-themes ThemeProvider.
 * Setzt das Theme über eine CSS-Klasse auf dem <html>-Element (Tailwind darkMode: "class").
 * System-Modus wird unterstützt.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={true}
      disableTransitionOnChange={false}
      storageKey="hellouni-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
