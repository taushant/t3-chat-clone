/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore during initial bootstrap
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore during initial bootstrap
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
