import path from 'node:path';
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { output: 'standalone', outputFileTracingRoot: path.resolve(__dirname, '../..'), turbopack: { root: path.resolve(__dirname, '../..') }, transpilePackages: ['@uav/ui','@uav/api-client','@uav/config','@uav/query','@uav/types','@uav/auth-contracts','@uav/design-tokens'] };
export default nextConfig;
