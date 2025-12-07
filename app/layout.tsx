import type { Metadata, Viewport } from "next";
import { Inter, Gloock } from "next/font/google";
import "./globals.css";
import "./design-tokens.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { PageTransition } from "@/components/page-transition";
import { NavigationProvider } from "@/components/navigation-context";

const inter = Inter({ subsets: ["latin"] });
const gloock = Gloock({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gloock"
});

export const metadata: Metadata = {
  title: "HelloUni",
  description: "Social Media App für Studierende",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.className} ${gloock.variable}`}>
        <NextAuthSessionProvider>
          <ConvexClientProvider>
            <NavigationProvider>
              <PageTransition>{children}</PageTransition>
            </NavigationProvider>
          </ConvexClientProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

