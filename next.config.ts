import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lsiaznviwffovnszffvx.supabase.co",
        port: "",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "archiver"],
  },
};

export default nextConfig;
