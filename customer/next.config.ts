import path from 'node:path';
import type {NextConfig} from 'next';

const operationsOrigin = process.env.NEXT_PUBLIC_OPERATIONS_URL || 'http://localhost:3200';
const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3300';

const nextConfig: NextConfig = {
    output: 'standalone',
    devIndicators: false,
    async redirects() {
        return [
            {source: '/favicon.ico', destination: '/uav-pas-logo.svg', permanent: false},
            {source: '/login', destination: '/?auth=login', permanent: false},
            {source: '/register', destination: '/?auth=register', permanent: false},
            {source: '/customer/login', destination: '/?auth=login&next=/customer/dashboard', permanent: false},
            {source: '/customer/register', destination: '/?auth=register&next=/customer/dashboard', permanent: false},
            {source: '/operations', destination: `${operationsOrigin}/operations/overview`, permanent: false},
            {source: '/operations/:path*', destination: `${operationsOrigin}/operations/:path*`, permanent: false},
            {source: '/admin', destination: `${adminOrigin}/admin/dashboard`, permanent: false},
            {source: '/admin/:path*', destination: `${adminOrigin}/admin/:path*`, permanent: false},
        ];
    },
    outputFileTracingRoot: path.resolve(__dirname),
    turbopack: {root: path.resolve(__dirname)},
};
export default nextConfig;
