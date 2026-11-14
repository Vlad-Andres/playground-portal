"use client";

import { useCallback, useSyncExternalStore } from "react";
import { addExamAttempt, reviveExamHistory, type ExamAttempt } from "@site/lib/examHistory";
import { createPersistentStore, type PersistentStore } from "@site/lib/store";
import { useSite } from "@site/site/context";

const stores = new Map<string, PersistentStore<ExamAttempt[]>>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createPersistentStore<ExamAttempt[]>(key, [], reviveExamHistory);
    stores.set(key, store);
  }
  return store;
}

export function useExamHistory() {
  const { storageKey } = useSite();
  const store = storeFor(storageKey("exam:v1"));
  const history = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const recordAttempt = useCallback((attempt: ExamAttempt) => store.set((current) => addExamAttempt(current, attempt)), [store]);
  return { history, recordAttempt };
}
