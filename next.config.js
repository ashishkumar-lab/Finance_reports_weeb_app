/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Required for Docker/Cloud Run deployment
};

module.exports = nextConfig;
