/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid ENOENT/corrupted webpack cache in dev (styling 404s)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

