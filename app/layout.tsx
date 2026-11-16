import type { ReactNode } from "react";
import { Instrument_Serif, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

// Self-hosted at build time, so the portal's `default-src 'self'` policy still holds.
const sans = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["italic", "normal"], variable: "--font-instrument", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains", display: "swap" });

export async function generateMetadata() {
  const t = await getTranslations("common");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html suppressHydrationWarning lang={locale} className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
