import type { NextConfig } from "next";

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
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
  experimental: {
  }
};

export default nextConfig;
