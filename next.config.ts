import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/dbt-planner' : '',
  images: { unoptimized: true }
};

export default nextConfig;
