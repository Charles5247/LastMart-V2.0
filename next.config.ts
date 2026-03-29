import type { NextConfig } from 'next';

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
  // Proxy all /api/* requests to the Express backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
