import path from 'node:path';
import type {NextConfig} from 'next';

const customerOrigin = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3100';
const operationsOrigin = process.env.NEXT_PUBLIC_OPERATIONS_URL || 'http://localhost:3200';

const nextConfig: NextConfig = {
    output: 'standalone',
    devIndicators: false,
    async redirects() {
        return [
            {source: '/favicon.ico', destination: '/uav-pas-logo.svg', permanent: false},
            {source: '/login', destination: '/?auth=login&next=/admin/dashboard', permanent: false},
            {source: '/admin/login', destination: '/?auth=login&next=/admin/dashboard', permanent: false},
            {source: '/customer', destination: `${customerOrigin}/customer/dashboard`, permanent: false},
            {source: '/customer/:path*', destination: `${customerOrigin}/customer/:path*`, permanent: false},
            {source: '/operations', destination: `${operationsOrigin}/operations/overview`, permanent: false},
            {source: '/operations/:path*', destination: `${operationsOrigin}/operations/:path*`, permanent: false},
        ];
    },
    outputFileTracingRoot: path.resolve(__dirname),
    turbopack: {root: path.resolve(__dirname)},
};
export default nextConfig;
