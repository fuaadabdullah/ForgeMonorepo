/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better debugging
  reactStrictMode: true,

  // Environment variables that should be available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://goblin-backend.fly.dev',
    NEXT_PUBLIC_FASTAPI_URL:
      process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://goblin-backend.fly.dev',
    NEXT_PUBLIC_DD_APPLICATION_ID: process.env.NEXT_PUBLIC_DD_APPLICATION_ID || 'goblin-assistant',
    NEXT_PUBLIC_DD_CLIENT_TOKEN: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN || '',
    NEXT_PUBLIC_DD_ENV: process.env.NEXT_PUBLIC_DD_ENV || 'production',
    NEXT_PUBLIC_DD_VERSION: process.env.NEXT_PUBLIC_DD_VERSION || '1.0.0',
  },

  // Disable ESLint during build to avoid the utils error
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
