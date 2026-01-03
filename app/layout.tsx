// Test commit for verification
import type { Metadata, Viewport } from "next";
import { Inter, Gloock, Poppins } from "next/font/google";
import "./globals.css";
import "./design-tokens.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { PostsCacheWrapper } from "@/components/posts-cache-wrapper";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
const gloock = Gloock({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gloock",
  display: "swap",
  preload: true,
});
const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "HelloUni",
  description: "Social Media App für Studierende",
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "HelloUni",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // iOS Safari: Unterstützung für Safe Area (Notch, Home Indicator)
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" style={{ colorScheme: 'light' }}>
      <head>
        {/* PWA Meta Tags für bessere Installation */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* iOS Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HelloUni" />
        
        {/* Android Chrome Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="HelloUni" />
        
        {/* PWA Installation Prompt */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
        
      </head>
      <body className={`${inter.className} ${gloock.variable} ${poppins.variable}`}>
        <NextAuthSessionProvider>
          <ConvexClientProvider>
            <PostsCacheWrapper>{children}</PostsCacheWrapper>
          </ConvexClientProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

