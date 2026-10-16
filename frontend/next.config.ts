import type { NextConfig } from "next";

const RENDER_BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cancer-detection-system-n1hx.onrender.com";

const nextConfig: NextConfig = {
  /* Dynamic proxying to active backend (port 8000/8001/cloud) handled in src/app/api/backend/[...path]/route.ts */
};

export default nextConfig;
