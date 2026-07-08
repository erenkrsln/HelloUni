// Test commit for verification
import type { Metadata, Viewport } from "next";
import { Inter, Gloock, Poppins } from "next/font/google";
import "./globals.css";
import "./design-tokens.css";
import "driver.js/dist/driver.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { PostsCacheWrapper } from "@/components/posts-cache-wrapper";
import ToastProvider from "@/components/toast";
import { CallProvider } from "@/components/call/CallProvider";
import { CallOverlay } from "@/components/call/CallOverlay";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { getToken } from "@/lib/auth-server";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const inter = Inter({ subsets: ["latin"] });
const gloock = Gloock({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gloock"
});
const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins"
});

export const metadata: Metadata = {
  title: "HelloUni",
  description: "Social Media App für Studierende",
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "HelloUni",
    statusBarStyle: "black-translucent",
    capable: true,
    startupImage: "/logo2.svg",
  },
  icons: {
    icon: "/logo2.svg",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "HelloUni",
    description: "Social Media App für Studierende",
    siteName: "HelloUni",
    images: [
      {
        url: "/logo_preview.png",
        width: 1200,
        height: 630,
        alt: "HelloUni Logo",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HelloUni",
    description: "Social Media App für Studierende",
    images: ["/logo_preview.png"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags für bessere Installation */}
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HelloUni" />
      </head>
      <body className={`${inter.className} ${gloock.variable} ${poppins.variable}`} suppressHydrationWarning>
        <ServiceWorkerRegister />
        <ConvexClientProvider initialToken={token}>
          <CallProvider>
            <ToastProvider>
              <PostsCacheWrapper>{children}</PostsCacheWrapper>
            </ToastProvider>
            <CallOverlay />
            <IncomingCallModal />
          </CallProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

