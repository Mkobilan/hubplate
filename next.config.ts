import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  serverExternalPackages: ["pdf-parse"],
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  webpack: (config) => {
    config.resolve.alias.canvas = path.resolve(__dirname, "src/lib/pdf/canvas-mock.ts");
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
  experimental: {
  }
};

export default nextConfig;
