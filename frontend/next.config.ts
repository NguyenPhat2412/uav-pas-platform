import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  experimental: {
    // appDir: true,
    // serverActions: true,
  },
};

export default nextConfig;
