import path from 'node:path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: { root: path.resolve(__dirname) },
  experimental: {
    // appDir: true,
    // serverActions: true,
  },
};

export default nextConfig;
