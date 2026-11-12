"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";

interface Me {
  enabled: boolean;
  signedIn: boolean;
  name: string;
}

/** Sign in / my courses / sign out. Renders nothing while accounts are not configured. */
export function AccountMenu() {
  const t = useTranslations("account");
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<Me>)
      .then((value) => alive && setMe(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!me?.enabled) return null;
  if (!me.signedIn) {
    return (
      <a className="account-link" href="/api/auth/google" onClick={(event) => (event.currentTarget.href = `/api/auth/google?next=${encodeURIComponent(window.location.pathname)}`)}>
        {t("signIn")}
      </a>
    );
  }
  return (
    <span className="account-menu">
      <a className="account-link" href="/my">{me.name ? `${me.name} · ${t("myCourses")}` : t("myCourses")}</a>
      <button type="button" className="account-link" onClick={() => void signOut()}>{t("signOut")}</button>
    </span>
  );
}
