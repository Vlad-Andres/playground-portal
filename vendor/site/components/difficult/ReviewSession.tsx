"use client";

import { useState } from "react";
import { PartyPopper, Sparkles } from "lucide-react";
import { MasteryDots } from "@site/components/difficult/DifficultItemCard";
import { ReviewBlockView } from "@site/components/difficult/ReviewBlockView";
import { clozeSentences, extractTerms, formatDue, type ResolvedItem } from "@site/components/difficult/kit";
import { Card } from "@site/components/ui/Card";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { useDifficult } from "@site/hooks/useDifficult";
import { RATING_XP, schedule, type Rating } from "@site/lib/difficult";
import { cn } from "@site/lib/cn";

const RATINGS: { id: Rating; label: string; className: string }[] = [
  { id: "again", label: "Again", className: "border-danger/40 bg-danger-soft text-danger" },
  { id: "hard", label: "Hard", className: "border-warning/40 bg-warning-soft text-warning" },
  { id: "good", label: "Good", className: "border-brand/40 bg-brand-soft text-brand-strong" },
  { id: "easy", label: "Easy", className: "border-positive/40 bg-positive-soft text-positive" },
];

interface ReviewSessionProps {
  due: ResolvedItem[];
  now: number;
  nextDue: number | null;
}

/** Spaced-repetition session over the due items: recall first, then check and rate. */
export function ReviewSession({ due, now, nextDue }: ReviewSessionProps) {
  const { review } = useDifficult();
  // The queue is fixed when the session starts, so rating an item does not reshuffle it.
  const [queue] = useState(() => due.map((entry) => entry.item.key));
  const [position, setPosition] = useState(0);
  const [shown, setShown] = useState(false);
  const [gained, setGained] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);

  const current = due.find((entry) => entry.item.key === queue[position]);

  if (queue.length === 0 || !current) {
    return (
      <Card className="grid place-items-center gap-3 p-8 text-center">
        <PartyPopper size={32} className="text-accent" aria-hidden />
        <p className="text-lg font-semibold text-ink">{queue.length === 0 ? "Nothing is due right now." : "Session complete!"}</p>
        <p className="text-sm text-muted">
          {gained > 0 ? `You earned ${gained} XP. ` : ""}
          {nextDue !== null ? `The next part is due ${formatDue(nextDue, now)}.` : "Flag more parts in the lectures to review them here."}
        </p>
      </Card>
    );
  }

  const cues = clozeSentences(current.text, 3);
  const terms = extractTerms(current.text, current.lecture.concepts, 6);

  function rate(rating: Rating) {
    if (!current) return;
    review(current.item.key, rating);
    setGained((value) => value + RATING_XP[rating]);
    setLastXp(RATING_XP[rating]);
    setShown(false);
    setPosition((value) => value + 1);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          Card {position + 1} of {queue.length}
        </span>
        {lastXp !== null ? (
          <span key={position} className="animate-rise inline-flex items-center gap-1 font-semibold text-accent">
            <Sparkles size={14} aria-hidden /> +{lastXp} XP
          </span>
        ) : null}
        <span>{gained} XP this session</span>
      </div>
      <ProgressBar value={position / queue.length} label="Session progress" />

      <Card className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-faint">
            {current.lecture.number > 0 ? `Lecture ${current.lecture.number} · ` : ""}
            {current.lecture.title}
          </p>
          <MasteryDots box={current.item.box} />
        </div>
        <h3 className="text-xl font-semibold text-ink">{current.sectionTitle}</h3>

        <div className="grid gap-2 rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <p className="text-sm font-semibold text-brand-strong">Recall before you look</p>
          {cues.length > 0 ? (
            <ul className="grid gap-1.5 text-sm text-muted">
              {cues.map((parts, index) => (
                <li key={index}>
                  {parts.map((part, partIndex) =>
                    part.kind === "text" ? (
                      <span key={partIndex}>{part.text} </span>
                    ) : (
                      <span key={partIndex} className={cn("rounded px-1 font-semibold", shown ? "bg-warning-soft text-ink" : "bg-line text-transparent select-none")}>
                        {part.answer}
                      </span>
                    ),
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Explain from memory: {terms.length > 0 ? terms.join(", ") : "the main idea of this part"}.
            </p>
          )}
          {current.item.note ? (
            <p className="text-xs text-faint">Your own explanation is shown with the answer.</p>
          ) : null}
        </div>

        {shown ? (
          <div className="animate-rise grid gap-5 border-t border-line pt-4">
            {current.item.note ? (
              <div className="rounded-xl border border-line bg-sunken px-4 py-3 text-sm">
                <span className="font-semibold text-ink">Your words: </span>
                <span className="text-muted">{current.item.note}</span>
              </div>
            ) : null}
            {current.blocks.map((block, index) => (
              <ReviewBlockView key={index} block={block} concepts={current.lecture.concepts} href={current.href} />
            ))}
          </div>
        ) : null}

        {shown ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted">How well did you remember it?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((rating) => (
                <button
                  key={rating.id}
                  type="button"
                  onClick={() => rate(rating.id)}
                  className={cn("grid gap-0.5 rounded-xl border px-3 py-2 text-sm font-semibold", rating.className)}
                >
                  {rating.label}
                  <span className="text-xs font-normal opacity-80">{formatDue(schedule(current.item, rating.id, now).due, now).replace("in ", "again in ")}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="justify-self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:opacity-90"
          >
            Show the answer
          </button>
        )}
      </Card>
    </div>
  );
}
