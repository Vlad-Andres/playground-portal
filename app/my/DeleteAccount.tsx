"use client";

import { useTranslations } from "next-intl";
import { deleteMyAccount } from "./account-actions";
import styles from "./my.module.css";

export function DeleteAccount() {
  const t = useTranslations("my");
  return (
    <section className={styles.danger}>
      <h2>{t("deleteAccountTitle")}</h2>
      <p>{t("deleteAccountText")}</p>
      <button
        type="button"
        className={styles.dangerButton}
        onClick={async () => {
          if (!window.confirm(t("deleteAccountConfirm"))) return;
          await deleteMyAccount();
          window.location.assign("/");
        }}
      >
        {t("deleteAccountButton")}
      </button>
    </section>
  );
}
