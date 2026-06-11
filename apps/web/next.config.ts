import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@crafted/shared"],
  images: {
    // Supabase project URLs vary per environment, so allow any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
