import type { Metadata, Viewport } from "next";
import { Inter, Gloock } from "next/font/google";
import "./globals.css";
import "./design-tokens.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";

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
        <ErrorBoundary>
          <NextAuthSessionProvider>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </NextAuthSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

