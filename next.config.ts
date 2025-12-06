import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
        // Convex Storage URLs können verschiedene Pfade haben
      },
    ],
    // Optimierungen für bessere Performance
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizePackageImports: ["convex", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;


