import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { headerRules } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // The shared course UI links to "/courses/<key>/lectures/<slug>/" (the template's static export uses
  // trailing slashes); serve those directly instead of redirecting every click.
  skipTrailingSlashRedirect: true,
  async headers() {
    return headerRules(process.env.NODE_ENV === "development");
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
