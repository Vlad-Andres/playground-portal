"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { verifyApiKey } from "@site/lib/assistant/gemini";
import { storeApiKey } from "@site/lib/assistant/credentials";
import { useSite } from "@site/site/context";

export function ConnectForm() {
  const { storageKey } = useSite();
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    const candidate = apiKey.trim();
    setChecking(true);
    setError(null);
    try {
      await verifyApiKey(candidate);
      storeApiKey(storageKey("gemini-api-key"), candidate, remember ? "device" : "session");
      setApiKey("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not verify the key.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <form
      className="grid gap-4 overflow-y-auto p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void connect();
      }}
    >
      <div className="grid gap-1.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound size={16} className="text-brand" aria-hidden />
          Connect a free Gemini API key
        </p>
        <p className="text-sm text-muted">
          Answers come from Google&apos;s Gemini, grounded in this lecture&apos;s material. A key
          from Google AI Studio is free and needs no credit card.
        </p>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted">API key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste your Gemini API key"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-faint"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="mt-0.5 accent-brand"
        />
        <span>
          Remember on this device
          <span className="block text-xs text-faint">
            Off: the key is forgotten when you close this tab.
          </span>
        </span>
      </label>

      {error ? (
        <p className="rounded-xl border border-danger/35 bg-danger-soft/60 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={checking || apiKey.trim().length === 0}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {checking ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : null}
        {checking ? "Checking the key…" : "Connect"}
      </button>

      <div className="grid gap-2 rounded-xl border border-line bg-sunken px-3 py-2.5 text-xs text-muted">
        <p>
          Get a key from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-brand underline decoration-brand/40 underline-offset-2"
          >
            Google AI Studio
            <ExternalLink size={11} aria-hidden />
          </a>
          . On the free tier Google may use your questions to improve its products, so keep
          personal information out of them.
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-positive" aria-hidden />
          The key stays in this browser and is sent only to Google&apos;s Gemini API — this site has
          no server, and its security policy blocks requests to any other host.
        </p>
      </div>
    </form>
  );
}
