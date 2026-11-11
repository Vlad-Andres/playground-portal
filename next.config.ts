import type { NextConfig } from "next";
import { headerRules } from "./lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return headerRules(process.env.NODE_ENV === "development");
  },
};

export default nextConfig;
