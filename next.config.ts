import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION,
  turbopack: {
    root: process.cwd(),
  },
  cacheComponents: true,
  allowedDevOrigins: ['100.104.165.110', 'localhost', '127.0.0.1'],
  async headers() {
    return [
      {
        source: "/admin-sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
