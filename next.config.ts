import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.figma.com",
        pathname: "/api/mcp/asset/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
    // Optimierungen für bessere Performance
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 Jahr - für besseres Caching
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90], // Unterstützte Qualitätsstufen für Bilder
  },
  experimental: {
    optimizePackageImports: ["convex", "framer-motion", "lucide-react"],
  },
};

export default nextConfig