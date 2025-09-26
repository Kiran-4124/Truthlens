import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configure for Vercel deployment
  images: {
    domains: [],
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
