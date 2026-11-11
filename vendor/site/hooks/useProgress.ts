"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPersistentStore, type PersistentStore } from "@site/lib/store";
import {
  QUIZ_PASS_RATIO,
  emptyLectureProgress,
  reviveProgress,
  type LectureProgress,
  type ProgressState,
} from "@site/lib/progress";
import { useSite } from "@site/site/context";

const stores = new Map<string, PersistentStore<ProgressState>>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createPersistentStore<ProgressState>(key, {}, reviveProgress);
    stores.set(key, store);
  }
  return store;
}

function updateLecture(
  state: ProgressState,
  slug: string,
  update: (entry: LectureProgress) => LectureProgress,
): ProgressState {
  const entry = state[slug] ?? emptyLectureProgress;
  return { ...state, [slug]: update(entry) };
}

export function useProgress() {
  const { storageKey } = useSite();
  const store = storeFor(storageKey("progress:v1"));
  const progress = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const toggleSection = useCallback((slug: string, sectionId: string) => {
    store.set((state) =>
      updateLecture(state, slug, (entry) => ({
        ...entry,
        sections: entry.sections.includes(sectionId)
          ? entry.sections.filter((id) => id !== sectionId)
          : [...entry.sections, sectionId],
      })),
    );
  }, [store]);

  const recordQuizResult = useCallback(
    (slug: string, quizSectionId: string, correct: number, total: number) => {
      store.set((state) =>
        updateLecture(state, slug, (entry) => {
          const quizBest = Math.max(entry.quizBest, correct);
          const passed = total > 0 && quizBest / total >= QUIZ_PASS_RATIO;
          return {
            ...entry,
            quizBest,
            quizTotal: total,
            sections:
              passed && !entry.sections.includes(quizSectionId)
                ? [...entry.sections, quizSectionId]
                : entry.sections,
          };
        }),
      );
    },
    [store],
  );

  const resetLecture = useCallback((slug: string) => {
    store.set((state) => ({ ...state, [slug]: emptyLectureProgress }));
  }, [store]);

  return { progress, toggleSection, recordQuizResult, resetLecture };
}
