/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // Keep for hydration safety
  // Remove: experimental: { esmExternals: false } — not needed in v15
};

module.exports = nextConfig;
