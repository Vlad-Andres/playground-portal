"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { LOCALES } from "@/i18n/config";

export function LanguageSwitch() {
  const current = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="language-switch" role="group" aria-label={t("language")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLocale(locale);
              router.refresh();
            })
          }
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
