"use client";

import { useState } from "react";
import type { Settings } from "@/lib/settings";
import { saveSettings } from "./actions";
import styles from "./admin.module.css";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={styles.card}
      action={async (formData) => {
        setPending(true);
        const result = await saveSettings(formData);
        setMessage(result.ok ? { ok: true, text: "Saved." } : { ok: false, text: result.error });
        setPending(false);
      }}
    >
      <label className={styles.check}>
        <input type="checkbox" name="generationPaused" defaultChecked={settings.generationPaused} /> Pause generation
      </label>
      <label className={styles.field}>
        Daily job limit <small>empty = environment value or 10; 1–500</small>
        <input name="dailyJobLimit" type="number" min={1} max={500} defaultValue={settings.dailyJobLimit ?? ""} />
      </label>
      <label className={styles.field}>
        Model id <small>empty = environment value or the default</small>
        <input name="model" defaultValue={settings.model ?? ""} maxLength={61} />
      </label>
      <label className={styles.field}>
        Announcement (English) <small>shown above the builder, up to 300 characters</small>
        <textarea name="announcementEn" defaultValue={settings.announcement.en} maxLength={300} rows={2} />
      </label>
      <label className={styles.field}>
        Announcement (Romanian)
        <textarea name="announcementRo" defaultValue={settings.announcement.ro} maxLength={300} rows={2} />
      </label>
      <div className={styles.row}>
        <button type="submit" disabled={pending}>Save settings</button>
        {message ? <span className={message.ok ? styles.ok : styles.error} role="status">{message.text}</span> : null}
      </div>
    </form>
  );
}
