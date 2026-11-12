"use client";

import { useTranslations } from "next-intl";

/** The translated text for an API or job error code; unknown codes get the generic text, never the raw code. */
export function useErrorText(): (code: string | undefined) => string {
  const t = useTranslations("errors");
  return (code) => (code && t.has(code) ? t(code) : t("generic"));
}
