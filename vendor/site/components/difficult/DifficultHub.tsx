"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flag, Flame, Gamepad2, Layers, ListTodo, Sparkles, Trophy } from "lucide-react";
import { LectureAssistant } from "@site/components/assistant/LectureAssistant";
import { DifficultItemCard } from "@site/components/difficult/DifficultItemCard";
import { MatchGame } from "@site/components/difficult/MatchGame";
import { ReviewSession } from "@site/components/difficult/ReviewSession";
import { plainText, resolveItem, type ResolvedItem } from "@site/components/difficult/kit";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { ProgressRing } from "@site/components/ui/ProgressRing";
import { useDifficult } from "@site/hooks/useDifficult";
import { DAILY_GOAL, MAX_BOX, levelFor, liveStreak, reviewsDoneToday } from "@site/lib/difficult";
import type { ReviewData } from "@site/lib/reviewData";
import { cn } from "@site/lib/cn";
import { useSite } from "@site/site/context";

type Tab = "focus" | "review" | "match";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function DifficultHub() {
  const { paths } = useSite();
  const { state, remove } = useDifficult();
  const now = useNow();
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("focus");
  const [sessionId, setSessionId] = useState(0);

  const items = useMemo(() => Object.values(state.items), [state.items]);
  const hasItems = items.length > 0;

  useEffect(() => {
    if (!hasItems || data) return;
    let cancelled = false;
    fetch(`${paths.home}review-data.json`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ReviewData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasItems, data, paths.home]);

  const { resolved, missing } = useMemo(() => {
    if (!data) return { resolved: [] as ResolvedItem[], missing: [] as string[] };
    const order = new Map(data.lectures.map((lecture, index) => [lecture.slug, index]));
    const found: ResolvedItem[] = [];
    const lost: string[] = [];
    for (const item of items) {
      const entry = resolveItem(data, item);
      if (entry) found.push(entry);
      else lost.push(item.key);
    }
    found.sort((a, b) => {
      const lecture = (order.get(a.item.slug) ?? 0) - (order.get(b.item.slug) ?? 0);
      if (lecture !== 0) return lecture;
      const sections = a.lecture.sections.findIndex((s) => s.id === a.item.sectionId) - b.lecture.sections.findIndex((s) => s.id === b.item.sectionId);
      return sections !== 0 ? sections : (a.item.blockIndex ?? -1) - (b.item.blockIndex ?? -1);
    });
    return { resolved: found, missing: lost };
  }, [data, items]);

  const due = resolved.filter((entry) => entry.item.due <= now).sort((a, b) => a.item.due - b.item.due);
  const upcoming = resolved.filter((entry) => entry.item.due > now).map((entry) => entry.item.due);
  const nextDue = upcoming.length > 0 ? Math.min(...upcoming) : null;
  const mastered = items.filter((item) => item.box === MAX_BOX).length;
  const { level, progress, toNext } = levelFor(state.xp);
  const streak = liveStreak(state, now);
  const today = reviewsDoneToday(state, now);

  const matchConcepts = useMemo(() => {
    if (!data) return [];
    const flagged = new Set(items.map((item) => item.slug));
    const lectures = data.lectures.filter((lecture) => flagged.has(lecture.slug));
    const pool = lectures.flatMap((lecture) => lecture.concepts);
    return pool.length >= 6 ? pool : data.lectures.flatMap((lecture) => lecture.concepts);
  }, [data, items]);

  const assistantContext = useMemo(
    () =>
      [
        "# Difficult parts",
        "These are the parts of the course the student marked as difficult. Help them understand and memorise these: offer simpler explanations, analogies, mnemonics and small examples.",
        ...resolved.map(
          (entry) =>
            `## ${entry.lecture.number > 0 ? `Lecture ${entry.lecture.number} — ` : ""}${entry.lecture.title}: ${entry.sectionTitle}\n\n${plainText(entry.text)}`,
        ),
      ].join("\n\n"),
    [resolved],
  );
  const sectionTitles = useMemo(
    () => Object.fromEntries(resolved.map((entry) => [entry.item.key, entry.sectionTitle])),
    [resolved],
  );

  const stats = [
    {
      label: `Level ${level}`,
      value: `${state.xp} XP`,
      extra: <ProgressBar value={progress} label={`${toNext} XP to level ${level + 1}`} />,
      hint: `${toNext} XP to level ${level + 1}`,
      icon: Sparkles,
    },
    { label: "Streak", value: `${streak} day${streak === 1 ? "" : "s"}`, hint: today > 0 ? "Reviewed today ✓" : streak > 0 ? "Review today to keep it" : "Review to start one", icon: Flame },
    { label: "Due now", value: String(data ? due.length : items.filter((item) => item.due <= now).length), hint: `${items.length} flagged in total`, icon: ListTodo },
    { label: "Mastered", value: `${mastered} / ${items.length}`, hint: "Reached box 5", icon: Trophy },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Layers; count?: number }[] = [
    { id: "focus", label: "Focus list", icon: Layers, count: items.length },
    { id: "review", label: "Review session", icon: ListTodo, count: due.length },
    { id: "match", label: "Match game", icon: Gamepad2 },
  ];

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
      <header className="grid gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-warning uppercase">
          <Flag size={14} className="fill-current" aria-hidden /> Your difficult parts
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Focus on what is hard</h1>
        <p className="max-w-3xl text-muted">
          Everything you flagged in the lectures, with tools to understand it and get it into long-term memory: a concept map, fill-in-the-gaps,
          flashcards, related quiz questions and your own explanation. The review session brings each part back just before you would forget
          it — spaced repetition with five boxes, as in Anki — and every review earns XP towards your daily goal.
        </p>
      </header>

      {!hasItems ? (
        <div className="grid gap-4 rounded-2xl border border-dashed border-line-strong p-8 text-center">
          <Flag size={28} className="mx-auto text-warning" aria-hidden />
          <p className="text-lg font-semibold text-ink">Nothing flagged yet</p>
          <p className="mx-auto max-w-xl text-sm text-muted">
            In any lecture, hover over a paragraph, table, figure or example and click the small flag next to it — or press
            <span className="mx-1 inline-flex items-center gap-1 rounded-md border border-line px-1.5 text-xs font-medium">
              <Flag size={11} aria-hidden /> Mark difficult
            </span>
            next to a section title to flag the whole section. It shows up here.
          </p>
          <Link href="/#lectures" className="mx-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:opacity-90">
            Go to the lectures
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4">
              <ProgressRing value={today / DAILY_GOAL} size={64} label={`${Math.min(today, DAILY_GOAL)}/${DAILY_GOAL}`} />
              <div className="grid gap-0.5">
                <span className="text-xs font-medium tracking-wide text-faint uppercase">Daily goal</span>
                <span className="text-sm text-ink">
                  {today >= DAILY_GOAL ? `${today} reviews — goal reached!` : `${today} / ${DAILY_GOAL} reviews · ${DAILY_GOAL - today} to go`}
                </span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map(({ label, value, hint, icon: Icon, extra }) => (
                <div key={label} className="grid content-start gap-1 rounded-2xl border border-line bg-surface px-4 py-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-faint uppercase">
                    <Icon size={13} className={cn(label === "Streak" && streak > 0 && "text-warning")} aria-hidden />
                    {label}
                  </dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums text-ink">{value}</dd>
                  {extra ?? <span className="text-xs text-faint">{hint}</span>}
                </div>
              ))}
            </dl>
          </div>

          <div role="tablist" className="flex flex-wrap gap-2 border-b border-line">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  if (id === "review") setSessionId((value) => value + 1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
                )}
              >
                <Icon size={15} aria-hidden />
                {label}
                {count !== undefined ? (
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", id === "review" && count > 0 ? "bg-warning-soft text-warning" : "bg-sunken text-faint")}>
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {error ? (
            <p className="text-sm text-danger">The lecture content could not be loaded. Check your connection and reload the page.</p>
          ) : !data ? (
            <p className="text-sm text-muted">Loading your difficult parts…</p>
          ) : (
            <>
              {missing.length > 0 ? (
                <p className="rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-muted">
                  {missing.length} flagged part{missing.length === 1 ? " no longer exists" : "s no longer exist"} because the lecture changed.{" "}
                  <button type="button" onClick={() => missing.forEach(remove)} className="font-medium text-brand underline">
                    Remove {missing.length === 1 ? "it" : "them"}
                  </button>
                </p>
              ) : null}

              {tab === "focus" ? (
                <div data-assistant-scope>
                  <div className="grid gap-6">
                    {resolved.map((entry) => (
                      <DifficultItemCard key={entry.item.key} resolved={entry} now={now} onRemove={() => remove(entry.item.key)} />
                    ))}
                  </div>
                </div>
              ) : null}
              {tab === "review" ? <ReviewSession key={sessionId} due={due} now={now} nextDue={nextDue} /> : null}
              {tab === "match" ? <MatchGame concepts={matchConcepts} /> : null}
            </>
          )}
        </>
      )}

      {data && resolved.length > 0 ? (
        <LectureAssistant slug="difficult-parts" label="Your difficult parts" context={assistantContext} sectionTitles={sectionTitles} />
      ) : null}
    </div>
  );
}
