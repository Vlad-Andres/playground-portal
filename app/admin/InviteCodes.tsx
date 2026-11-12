"use client";

import { useState } from "react";
import type { InviteCode } from "@/lib/settings";
import { createCode, deleteCode, setCodeActive } from "./actions";
import styles from "./admin.module.css";

export function InviteCodes({ codes }: { codes: InviteCode[] }) {
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState("");

  return (
    <div className={styles.card}>
      {fresh ? (
        <div className={styles.fresh} role="status">
          <code>{fresh}</code>
          <p>Copy it now. It is not stored and cannot be shown again.</p>
        </div>
      ) : null}
      <div className={styles.scroll}><table className={styles.table}>
        <thead>
          <tr><th>Label</th><th>Created</th><th>Active</th><th /></tr>
        </thead>
        <tbody>
          <tr>
            <td>From the environment (PORTAL_ACCESS_CODE)</td><td /><td>always</td><td />
          </tr>
          {codes.map((code) => (
            <tr key={code.id}>
              <td>{code.label}</td>
              <td>{code.createdAt.slice(0, 10)}</td>
              <td>{code.active ? "yes" : "no"}</td>
              <td className={styles.actions}>
                <button type="button" onClick={async () => void (await setCodeActive(code.id, !code.active))}>{code.active ? "Disable" : "Enable"}</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Delete the code "${code.label}"? People using it can no longer create courses.`)) await deleteCode(code.id);
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <form
        className={styles.row}
        action={async (formData) => {
          setError("");
          const result = await createCode(String(formData.get("label") ?? ""));
          if (result.ok) setFresh(result.code);
          else setError(result.error);
        }}
      >
        <input name="label" placeholder="Label, e.g. Databases class" maxLength={60} required aria-label="New code label" />
        <button type="submit">New code</button>
        {error ? <span className={styles.error} role="alert">{error}</span> : null}
      </form>
    </div>
  );
}
