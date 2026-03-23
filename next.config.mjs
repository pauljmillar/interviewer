/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['geist'],
  // @napi-rs/canvas ships native .node binaries — tell webpack not to bundle them
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
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

