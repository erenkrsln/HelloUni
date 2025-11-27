import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HelloUni – Social Media für Studierende",
  description:
    "Vernetze dich mit Kommiliton:innen, finde Lerngruppen und bleib auf dem Laufenden rund um dein Studium.",
  metadataBase: new URL("https://hellouni.app"),
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HelloUni",
  },
  openGraph: {
    title: "HelloUni – Social Media für Studierende",
    description:
      "Vernetze dich mit Kommiliton:innen, finde Lerngruppen und bleib auf dem Laufenden rund um dein Studium.",
    type: "website",
    url: "https://hellouni.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "HelloUni – Social Media für Studierende",
    description:
      "Studentische Social Media Plattform für Lerngruppen, Campus-News und Chats.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[var(--background)]">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HelloUni" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body
        className={`${poppins.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <Providers>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl">
              <div className="mx-auto h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.25),_transparent_60%)]" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
