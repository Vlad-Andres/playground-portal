"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ResolvedTheme } from "@site/lib/theme";
import { useSite } from "@site/site/context";

type ThemeSnapshot = ResolvedTheme | "pending";

interface ThemeEntry {
  snapshot: ThemeSnapshot;
  hydrated: boolean;
  listeners: Set<() => void>;
}

const entries = new Map<string, ThemeEntry>();

function entryFor(key: string): ThemeEntry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { snapshot: "pending", hydrated: false, listeners: new Set() };
    entries.set(key, entry);
  }
  return entry;
}

function apply(entry: ThemeEntry, theme: ResolvedTheme) {
  entry.snapshot = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  for (const listener of entry.listeners) listener();
}

function hydrate(key: string, entry: ThemeEntry) {
  if (entry.hydrated || typeof window === "undefined") return;
  entry.hydrated = true;

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(key);
  } catch {
    // Storage may be blocked; fall back to the system preference.
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(entry, stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light");
}

export function useTheme() {
  const { storageKey } = useSite();
  const key = storageKey("theme");
  const entry = entryFor(key);

  const subscribe = useCallback(
    (listener: () => void) => {
      entry.listeners.add(listener);
      hydrate(key, entry);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    [entry, key],
  );

  const value = useSyncExternalStore(
    subscribe,
    useCallback(() => entry.snapshot, [entry]),
    () => "pending" as ThemeSnapshot,
  );

  const setTheme = useCallback(
    (next: ResolvedTheme) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Ignored: the theme still applies for the current session.
      }
      apply(entry, next);
    },
    [entry, key],
  );

  const toggleTheme = useCallback(() => {
    setTheme(entry.snapshot === "dark" ? "light" : "dark");
  }, [entry, setTheme]);

  return {
    theme: value === "pending" ? ("light" as ResolvedTheme) : value,
    mounted: value !== "pending",
    setTheme,
    toggleTheme,
  };
}
