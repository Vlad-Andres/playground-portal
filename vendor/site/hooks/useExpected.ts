"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPersistentStore, type PersistentStore } from "@site/lib/store";
import { useSite } from "@site/site/context";

/** Which items of the "Expected at the exam" page the student already knows. */
interface ExpectedState {
  known: string[];
  hideKnown: boolean;
}

const fallback: ExpectedState = { known: [], hideKnown: false };

function revive(raw: unknown): ExpectedState | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<ExpectedState>;
  return {
    known: Array.isArray(source.known) ? source.known.filter((key): key is string => typeof key === "string") : [],
    hideKnown: source.hideKnown === true,
  };
}

const stores = new Map<string, PersistentStore<ExpectedState>>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createPersistentStore<ExpectedState>(key, fallback, revive);
    stores.set(key, store);
  }
  return store;
}

export function useExpected() {
  const { storageKey } = useSite();
  const store = storeFor(storageKey("expected:v1"));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const setKnown = useCallback((keys: string[], known: boolean) => {
    store.set((previous) => {
      const next = new Set(previous.known);
      for (const key of keys) {
        if (known) next.add(key);
        else next.delete(key);
      }
      return { ...previous, known: [...next] };
    });
  }, [store]);

  const setHideKnown = useCallback((hideKnown: boolean) => {
    store.set((previous) => ({ ...previous, hideKnown }));
  }, [store]);

  const reset = useCallback(() => store.set((previous) => ({ ...previous, known: [] })), [store]);

  return { state, setKnown, setHideKnown, reset };
}
