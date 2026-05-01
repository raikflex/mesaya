import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mesaya/database', '@mesaya/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
