"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { courseShareUrl } from "@/lib/sites/share";

const noSubscription = () => () => {};

/** Copies only the public course link, with what sharing it means. */
export function ShareCard({ siteUrl }: { siteUrl: string }) {
  const t = useTranslations("share");
  // The origin is only known in the browser; the server renders nothing.
  const origin = useSyncExternalStore(noSubscription, () => window.location.origin, () => null);
  const link = origin === null ? null : courseShareUrl(origin, siteUrl);
  const [copied, setCopied] = useState(false);

  if (link === null) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link!);
      setCopied(true);
    } catch {
      // the link stays selectable in the field
    }
  }

  return (
    <div className="edit-link share-link">
      <h3>{t("title")}</h3>
      <div className="edit-link-row">
        <input className="text-input" readOnly value={link} aria-label={t("title")} onFocus={(event) => event.currentTarget.select()} />
        <button type="button" onClick={copy}>{copied ? t("copied") : t("copy")}</button>
      </div>
      <p>{t("note")}</p>
    </div>
  );
}
