import type { NextConfig } from "next";
import { resolve } from "path";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  reactStrictMode: true,
  outputFileTracingRoot: resolve(__dirname),
  turbopack: {
    root: resolve(__dirname),
  },
  webpack: (config) => {
    config.resolve.modules = [
      resolve(__dirname, "node_modules"),
    ];
    return config;
  },
};

export default nextConfig;
