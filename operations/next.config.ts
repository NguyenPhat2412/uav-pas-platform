import path from 'node:path';
import type {NextConfig} from 'next';

const customerOrigin = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3100';
const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3300';

const nextConfig: NextConfig = {
    output: 'standalone',
    // Production shares uav.all1.vn with the other portals (Next multi-zones): a distinct asset prefix keeps this
    // zone's /_next files apart; nginx routes /operations-static/* here. Dev servers keep their own port and no prefix.
    assetPrefix: process.env.NODE_ENV === 'production' ? '/operations-static' : undefined,
    devIndicators: false,
    async redirects() {
        return [
            {source: '/favicon.ico', destination: '/uav-pas-logo.svg', permanent: false},
            {source: '/login', destination: '/?auth=login&next=/operations/overview', permanent: false},
            {source: '/operations/login', destination: '/?auth=login&next=/operations/overview', permanent: false},
            {source: '/customer', destination: `${customerOrigin}/customer/dashboard`, permanent: false},
            {source: '/customer/:path*', destination: `${customerOrigin}/customer/:path*`, permanent: false},
            {source: '/admin', destination: `${adminOrigin}/admin/dashboard`, permanent: false},
            {source: '/admin/:path*', destination: `${adminOrigin}/admin/:path*`, permanent: false},
        ];
    },
    outputFileTracingRoot: path.resolve(__dirname),
    turbopack: {root: path.resolve(__dirname)},
};
export default nextConfig;
