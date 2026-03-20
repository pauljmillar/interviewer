/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['geist'],
  async redirects() {
    return [
      { source: '/products', destination: '/ai-interviewer', permanent: true },
    ];
  },
  // Avoid ENOENT/corrupted webpack cache in dev (styling 404s)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

