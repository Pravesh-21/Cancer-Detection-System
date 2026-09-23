import type { NextConfig } from "next";

const RENDER_BACKEND_URL =
  process.env.BACKEND_API_URL ||
  "https://cancer-detection-system-n1hx.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${RENDER_BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
