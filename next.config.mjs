/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output keeps the production Docker image small.
  output: "standalone",
  experimental: {
    // Branding uploads (logos + banners) post through a Server Action.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
