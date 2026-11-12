"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { claim } from "@/app/my/actions";
import styles from "@/app/manage/manage.module.css";

export function ClaimBox({ token, signedIn }: { token: string; signedIn: boolean }) {
  const t = useTranslations("manage");
  const [problem, setProblem] = useState("");
  return (
    <section className={styles.card}>
      <h2 className={styles.heading} style={{ margin: 0 }}>{t("claimTitle")}</h2>
      <p className={styles.summary}>{t("claimText")}</p>
      {signedIn ? (
        <button
          type="button"
          className={styles.primary}
          onClick={async () => {
            const result = await claim(token);
            if (result && !result.ok) setProblem(t("claimTaken"));
          }}
        >
          {t("claimButton")}
        </button>
      ) : (
        <a className={styles.link} href="/api/auth/google" onClick={(event) => (event.currentTarget.href = `/api/auth/google?next=${encodeURIComponent(window.location.pathname)}`)}>{t("claimSignIn")}</a>
      )}
      {problem ? <p className={styles.error}>{problem}</p> : null}
    </section>
  );
}
