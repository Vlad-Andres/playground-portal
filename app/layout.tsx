import type { ReactNode } from "react";
import { Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

// A characterful serif for headings, self-hosted by Next at build time (CSP-safe, no runtime CDN).
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"], display: "swap" });

export async function generateMetadata() {
  const t = await getTranslations("common");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={display.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
