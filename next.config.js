/** @type {import('next').NextConfig} */
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';

const nextConfig = {
  // Enable standalone output for all container/server deployments
  // (Docker, Render, Railway, Fly.io, AWS, VPS)
  // Vercel and Netlify handle their own optimized builds and ignore this field.
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },

  // Proxy all /api/* requests to the Express backend at runtime.
  // On Vercel/Netlify: set BACKEND_API_URL to your Railway/Render backend URL.
  // On Docker/VPS: BACKEND_API_URL defaults to http://localhost:5000 (or http://backend:5000).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
