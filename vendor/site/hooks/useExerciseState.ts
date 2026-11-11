"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPersistentStore, type PersistentStore } from "@site/lib/store";
import {
  emptyTaskState,
  reviveExerciseState,
  type ExerciseState,
  type SelfMark,
  type TaskState,
} from "@site/lib/exercises";
import { useSite } from "@site/site/context";

const stores = new Map<string, PersistentStore<ExerciseState>>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createPersistentStore<ExerciseState>(key, {}, reviveExerciseState);
    stores.set(key, store);
  }
  return store;
}

export function useExerciseState() {
  const { storageKey } = useSite();
  const store = storeFor(storageKey("exercises:v1"));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const update = useCallback((key: string, patch: Partial<TaskState>) => {
    store.set((previous) => ({
      ...previous,
      [key]: { ...(previous[key] ?? emptyTaskState), ...patch },
    }));
  }, [store]);

  const setValue = useCallback(
    (key: string, value: string) => update(key, { value }),
    [update],
  );

  const toggleOption = useCallback((key: string, option: string) => {
    store.set((previous) => {
      const current = previous[key] ?? emptyTaskState;
      const selected = current.selected.includes(option)
        ? current.selected.filter((value) => value !== option)
        : [...current.selected, option];
      return { ...previous, [key]: { ...current, selected } };
    });
  }, [store]);

  const reveal = useCallback((key: string) => update(key, { revealed: true }), [update]);

  const setSelfMark = useCallback(
    (key: string, selfMark: SelfMark) => update(key, { selfMark }),
    [update],
  );

  const resetSheet = useCallback((sheetId: string) => {
    store.set((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([key]) => !key.startsWith(`${sheetId}:`)),
      ),
    );
  }, [store]);

  return { state, update, setValue, toggleOption, reveal, setSelfMark, resetSheet };
}
