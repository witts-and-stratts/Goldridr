import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION,
  turbopack: {
    root: process.cwd(),
  },
  cacheComponents: true,
  allowedDevOrigins: ['100.104.165.110', 'localhost', '127.0.0.1']
};

export default nextConfig;
