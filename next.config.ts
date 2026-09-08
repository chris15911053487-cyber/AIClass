import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.DEPLOYMENT_TARGET === 'docker' ? { output: 'standalone' } : {};

export default nextConfig;
