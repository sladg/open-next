/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  cleanDistDir: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        hostname: "**.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
