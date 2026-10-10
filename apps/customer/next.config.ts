import type { NextConfig } from 'next';
const nextConfig: NextConfig = { output: 'standalone', transpilePackages: ['@uav/ui','@uav/api-client','@uav/config','@uav/query','@uav/types','@uav/auth-contracts','@uav/design-tokens'] };
export default nextConfig;
