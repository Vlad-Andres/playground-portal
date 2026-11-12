"use client";

import { useState } from "react";
import { login } from "./actions";
import styles from "./admin.module.css";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className={styles.login}
      action={async (formData) => {
        setPending(true);
        const result = await login(formData);
        if (result?.error) setError(result.error);
        setPending(false);
      }}
    >
      <label htmlFor="token">Admin token</label>
      <input id="token" name="token" type="password" autoComplete="off" required />
      <button type="submit" disabled={pending}>Log in</button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
  );
}
