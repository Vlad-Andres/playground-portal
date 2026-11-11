"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPersistentStore, type PersistentStore } from "@site/lib/store";
import {
  applyReview,
  emptyDifficultState,
  itemKey,
  newItem,
  reviveDifficult,
  type DifficultState,
  type Rating,
} from "@site/lib/difficult";
import { useSite } from "@site/site/context";

const stores = new Map<string, PersistentStore<DifficultState>>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createPersistentStore<DifficultState>(key, emptyDifficultState, reviveDifficult);
    stores.set(key, store);
  }
  return store;
}

export function useDifficult() {
  const { storageKey } = useSite();
  const store = storeFor(storageKey("difficult:v1"));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const toggle = useCallback((slug: string, sectionId: string, blockIndex: number | null) => {
    const key = itemKey(slug, sectionId, blockIndex);
    store.set((previous) => {
      const items = { ...previous.items };
      if (items[key]) delete items[key];
      else items[key] = newItem(slug, sectionId, blockIndex, Date.now());
      return { ...previous, items };
    });
  }, [store]);

  const remove = useCallback((key: string) => {
    store.set((previous) => {
      if (!previous.items[key]) return previous;
      const items = { ...previous.items };
      delete items[key];
      return { ...previous, items };
    });
  }, [store]);

  const review = useCallback((key: string, rating: Rating) => {
    store.set((previous) => applyReview(previous, key, rating, Date.now()));
  }, [store]);

  const setNote = useCallback((key: string, note: string) => {
    store.set((previous) => {
      const item = previous.items[key];
      if (!item || item.note === note) return previous;
      return { ...previous, items: { ...previous.items, [key]: { ...item, note } } };
    });
  }, [store]);

  const recordMatch = useCallback((seconds: number) => {
    store.set((previous) => ({
      ...previous,
      xp: previous.xp + 20,
      matchBest: previous.matchBest === null ? seconds : Math.min(previous.matchBest, seconds),
    }));
  }, [store]);

  return { state, toggle, remove, review, setNote, recordMatch };
}
