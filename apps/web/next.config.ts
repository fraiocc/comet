import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.modrinth.com" },
      { protocol: "https", hostname: "hangarcdn.papermc.io" },
      { protocol: "https", hostname: "hangar.papermc.io" },
    ],
  },
};

export default withNextIntl(nextConfig);
