import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // appDir: true,
    // serverActions: true,
  },
};

export default nextConfig;
