"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveTranslations } from "../actions";
import styles from "../admin.module.css";

type Locale = "en" | "ro";

export interface TranslationRow {
  key: string;
  defaults: Record<Locale, string>;
  overrides: Record<Locale, string | null>;
}

const LOCALES: Locale[] = ["en", "ro"];
const id = (locale: Locale, key: string) => `${locale}:${key}`;

export function TranslationEditor({ rows }: { rows: TranslationRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  // What the admin typed (string) or chose to reset (null), per locale and key.
  const [edits, setEdits] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const current = (row: TranslationRow, locale: Locale): string => {
    const edit = edits[id(locale, row.key)];
    if (edit === null) return row.defaults[locale];
    return edit ?? row.overrides[locale] ?? row.defaults[locale];
  };
  const isOverridden = (row: TranslationRow, locale: Locale) => {
    const edit = edits[id(locale, row.key)];
    return edit === undefined ? row.overrides[locale] !== null : edit !== null && edit !== row.defaults[locale];
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyChanged && !LOCALES.some((locale) => row.overrides[locale] !== null || edits[id(locale, row.key)] !== undefined)) return false;
      if (!needle) return true;
      return [row.key, row.defaults.en, row.defaults.ro, row.overrides.en ?? "", row.overrides.ro ?? ""].some((text) => text.toLowerCase().includes(needle));
    });
  }, [rows, query, onlyChanged, edits]);

  const pendingCount = Object.keys(edits).length;

  /** Back to the shipped text: drop an unsaved edit, or mark a saved override for removal. */
  function reset(row: TranslationRow, locale: Locale) {
    const entry = id(locale, row.key);
    setEdits((all) => {
      const next = { ...all };
      if (row.overrides[locale] === null) delete next[entry];
      else next[entry] = null;
      return next;
    });
  }

  async function save() {
    const changes = Object.entries(edits).map(([entry, value]) => {
      const [locale, ...rest] = entry.split(":");
      return { locale: locale as Locale, key: rest.join(":"), value };
    });
    if (changes.length === 0) return;
    setPending(true);
    setStatus("");
    const result = await saveTranslations(changes);
    const failed = Object.fromEntries(result.errors.map((error) => [id(error.locale as Locale, error.key), error.message]));
    setErrors(failed);
    // Keep only the edits that failed, so they can be fixed; the page reloads the saved ones.
    setEdits((all) => Object.fromEntries(Object.entries(all).filter(([entry]) => entry in failed)));
    setStatus(`${result.saved} saved${result.errors.length ? `, ${result.errors.length} refused (see the red notes)` : ""}.`);
    setPending(false);
    // Reload the saved texts from the server but keep the refused edits and their notes on screen.
    if (result.saved > 0) router.refresh();
  }

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <input type="search" placeholder="Search key or text" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search translations" />
        <label className={styles.check}>
          <input type="checkbox" checked={onlyChanged} onChange={(event) => setOnlyChanged(event.target.checked)} /> Only changed texts
        </label>
        <span className={styles.note}>{visible.length} of {rows.length}</span>
      </div>

      <div className={styles.translations}>
        {visible.map((row) => (
          <div key={row.key} className={styles.translation}>
            <code className={styles.translationKey}>{row.key}</code>
            {LOCALES.map((locale) => {
              const entry = id(locale, row.key);
              return (
                <label key={locale} className={styles.field}>
                  <span>
                    {locale.toUpperCase()} {isOverridden(row, locale) ? <em className={styles.changed}>changed</em> : null}
                    {isOverridden(row, locale) ? (
                      <button type="button" className={styles.linkButton} onClick={() => reset(row, locale)}>
                        Reset
                      </button>
                    ) : null}
                  </span>
                  <textarea
                    rows={Math.min(6, Math.max(1, Math.ceil(current(row, locale).length / 70)))}
                    maxLength={2000}
                    value={current(row, locale)}
                    onChange={(event) => setEdits((all) => ({ ...all, [entry]: event.target.value }))}
                  />
                  {isOverridden(row, locale) ? <small>Default: {row.defaults[locale]}</small> : null}
                  {errors[entry] ? <small className={styles.error}>{errors[entry]}</small> : null}
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.saveBar}>
        <button type="button" onClick={save} disabled={pending || pendingCount === 0}>Save {pendingCount || ""} change{pendingCount === 1 ? "" : "s"}</button>
        {status ? <span className={styles.ok} role="status">{status}</span> : null}
      </div>
    </div>
  );
}
