"use client";

import { useState } from "react";
import type { ImportResult } from "@/lib/sites/import";
import { importCourse } from "./actions";
import styles from "./admin.module.css";

/** Upload a course bundle (from the template's `npm run generate -- --bundle`) and publish it. */
export function ImportCourse() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={styles.card}
      action={async (formData) => {
        setPending(true);
        setResult(await importCourse(formData));
        setPending(false);
      }}
    >
      <p>Publish a course bundle made with <code>npm run generate -- --bundle</code> (a <code>.json</code> file, up to 2 MB).</p>
      <div className={styles.row}>
        <input name="bundle" type="file" accept=".json,application/json" required aria-label="Course bundle file" />
        <button type="submit" disabled={pending}>{pending ? "Publishing…" : "Publish course"}</button>
      </div>
      {result?.ok ? (
        <p className={styles.ok} role="status">
          Published: <a href={result.siteUrl}>{result.siteUrl}</a> · private edit link: <a href={result.manageUrl}>{result.manageUrl}</a> (copy it now, it is not shown again)
        </p>
      ) : null}
      {result && !result.ok ? <p className={styles.error} role="alert">{result.error}</p> : null}
    </form>
  );
}
