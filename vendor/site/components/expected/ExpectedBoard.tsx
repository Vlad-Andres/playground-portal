"use client";

import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, EyeOff, RotateCcw, Target } from "lucide-react";
import { Markdown } from "@site/components/content/Markdown";
import { Badge } from "@site/components/ui/Badge";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { expectedKey, type ExpectedTopic } from "@site/content/expected";
import { useExpected } from "@site/hooks/useExpected";
import { cn } from "@site/lib/cn";
import { useSite } from "@site/site/context";

function TopicSection({ topic }: { topic: ExpectedTopic }) {
  const { paths } = useSite();
  const { state, setKnown } = useExpected();
  const keys = topic.items.map((item) => expectedKey(topic.id, item.id));
  const knownCount = keys.filter((key) => state.known.includes(key)).length;
  const allKnown = knownCount === keys.length;
  const visible = topic.items.filter((item) => !(state.hideKnown && state.known.includes(expectedKey(topic.id, item.id))));

  if (state.hideKnown && allKnown) return null;

  return (
    <section id={topic.id} className="grid scroll-mt-24 gap-4">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{topic.lectures}</Badge>
          <Badge tone={allKnown ? "positive" : "neutral"}>
            {keys.length - knownCount} of {keys.length} to study
          </Badge>
          {topic.links.map((link) => (
            <Link
              key={link.slug}
              href={paths.lecture(link.slug)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand"
            >
              {link.label} in full <ArrowUpRight size={12} aria-hidden />
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{topic.title}</h2>
          <button
            type="button"
            onClick={() => setKnown(keys, !allKnown)}
            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-brand/40 hover:text-brand"
          >
            {allKnown ? "Study all of this again" : "I know all of this"}
          </button>
        </div>
        <details className="group rounded-xl border border-line bg-sunken/60 px-3 py-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-ink">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden />
            What the course says is expected
          </summary>
          <p className="mt-2 text-muted">{topic.official}</p>
        </details>
      </header>

      <ul className="grid gap-3">
        {visible.map((item) => {
          const key = expectedKey(topic.id, item.id);
          const known = state.known.includes(key);
          return (
            <li
              key={item.id}
              id={`${topic.id}-${item.id}`}
              className={cn(
                "scroll-mt-24 rounded-2xl border bg-surface transition-colors",
                known ? "border-line opacity-60" : "border-line shadow-[var(--shadow-card)]",
              )}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <h3 className={cn("text-base font-semibold", known ? "text-muted line-through decoration-faint" : "text-ink")}>
                  {item.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setKnown([key], !known)}
                  aria-pressed={known}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    known
                      ? "border-positive/40 bg-positive-soft text-positive"
                      : "border-line bg-surface text-muted hover:border-positive/40 hover:text-positive",
                  )}
                >
                  <Check size={13} aria-hidden />
                  {known ? "I know this" : "Mark as known"}
                </button>
              </div>
              {known ? null : (
                <div className="border-t border-line px-4 py-3">
                  <Markdown className="text-sm">{item.md}</Markdown>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ExpectedBoard() {
  const { data } = useSite();
  const expectedTopics = data.expected;
  const expectedItemCount = expectedTopics.reduce((sum, topic) => sum + topic.items.length, 0);
  const { state, setHideKnown, reset } = useExpected();
  const allKeys = new Set(expectedTopics.flatMap((topic) => topic.items.map((item) => expectedKey(topic.id, item.id))));
  const knownCount = state.known.filter((key) => allKeys.has(key)).length;
  const remaining = expectedItemCount - knownCount;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
      <header className="grid gap-4">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand uppercase">
          <Target size={14} aria-hidden /> Last-day revision
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Expected at the exam</h1>
        <p className="max-w-3xl text-muted">
          Only what the course says you are expected to know, lecture by lecture, in the shortest form that is still complete. Mark what
          you already know to collapse it — or hide it — and study what is left. The lecture pages have the full explanations and
          examples.
        </p>

        <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">
              {remaining === 0 ? "You marked everything as known." : `${remaining} of ${expectedItemCount} items left to study`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHideKnown(!state.hideKnown)}
                aria-pressed={state.hideKnown}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                  state.hideKnown ? "border-brand/50 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:border-brand/40",
                )}
              >
                <EyeOff size={13} aria-hidden />
                {state.hideKnown ? "Hiding what I know" : "Hide what I know"}
              </button>
              {knownCount > 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-brand/40"
                >
                  <RotateCcw size={13} aria-hidden />
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          <ProgressBar value={knownCount / expectedItemCount} label="Items marked as known" tone={remaining === 0 ? "positive" : "brand"} />
          <nav aria-label="Topics" className="flex flex-wrap gap-1.5">
            {expectedTopics.map((topic) => {
              const left = topic.items.filter((item) => !state.known.includes(expectedKey(topic.id, item.id))).length;
              return (
                <a
                  key={topic.id}
                  href={`#${topic.id}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                    left === 0 ? "border-positive/30 bg-positive-soft text-positive" : "border-line bg-sunken text-muted hover:border-brand/40",
                  )}
                >
                  {topic.lectures.replace("Lectures ", "L").replace("Lecture ", "L")} · {topic.title}
                  <span className="tabular-nums opacity-70">{left === 0 ? "✓" : left}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      {expectedTopics.map((topic) => (
        <TopicSection key={topic.id} topic={topic} />
      ))}

      {state.hideKnown && remaining === 0 ? (
        <p className="rounded-2xl border border-positive/30 bg-positive-soft px-4 py-6 text-center text-sm font-medium text-ink">
          Nothing left — everything is marked as known. Turn off “Hide what I know” to see it all again.
        </p>
      ) : null}
    </div>
  );
}
