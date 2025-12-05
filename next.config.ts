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
    ],
  },
  experimental: {
    optimizePackageImports: ["convex", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;


