/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'sharp'],
  },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: '**' }, { protocol: 'https', hostname: '**' }],
  },
};

module.exports = nextConfig;
