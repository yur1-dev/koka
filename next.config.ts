/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // Enforce to catch hydration early
  experimental: {
    esmExternals: false, // Helps bundle libs like lucide/bcrypt without mismatches
  },
};

module.exports = nextConfig;
