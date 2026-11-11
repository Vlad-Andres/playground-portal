"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Play, Timer, Trophy } from "lucide-react";
import type { Concept } from "@site/content/types";
import { shuffle } from "@site/components/difficult/kit";
import { Card } from "@site/components/ui/Card";
import { useDifficult } from "@site/hooks/useDifficult";
import { cn } from "@site/lib/cn";

const PAIRS = 6;
const PENALTY_MS = 1000;

interface Tile {
  id: string;
  pair: string;
  text: string;
  kind: "term" | "definition";
}

function maskTerm(definition: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const masked = definition.replace(new RegExp(escaped, "gi"), "▢▢▢");
  return masked.length > 110 ? `${masked.slice(0, 107)}…` : masked;
}

/** Match each term to its definition against the clock — the matching game of flashcard apps. */
export function MatchGame({ concepts }: { concepts: Concept[] }) {
  const { state, recordMatch } = useDifficult();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState<number | null>(null);

  const running = startedAt !== null && finished === null;

  useEffect(() => {
    if (!running || startedAt === null) return;
    const timer = window.setInterval(() => setElapsed(performance.now() - startedAt), 100);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);

  function start(event: MouseEvent) {
    const chosen = shuffle(concepts).slice(0, PAIRS);
    setTiles(
      shuffle(
        chosen.flatMap((concept) => [
          { id: `${concept.id}-t`, pair: concept.id, text: concept.term, kind: "term" as const },
          { id: `${concept.id}-d`, pair: concept.id, text: maskTerm(concept.short, concept.term), kind: "definition" as const },
        ]),
      ),
    );
    setMatched(new Set());
    setSelected(null);
    setWrong([]);
    setPenalty(0);
    setElapsed(0);
    setFinished(null);
    setStartedAt(event.timeStamp);
  }

  function pick(tile: Tile, event: MouseEvent) {
    if (!running || matched.has(tile.pair)) return;
    if (!selected || selected.id === tile.id) {
      setSelected(selected?.id === tile.id ? null : tile);
      return;
    }
    if (selected.pair === tile.pair && selected.kind !== tile.kind) {
      const next = new Set(matched).add(tile.pair);
      setMatched(next);
      setSelected(null);
      if (next.size === tiles.length / 2 && startedAt !== null) {
        const seconds = Math.round(((event.timeStamp - startedAt + penalty) / 1000) * 10) / 10;
        setFinished(seconds);
        recordMatch(seconds);
      }
    } else {
      setWrong([selected.id, tile.id]);
      setPenalty((value) => value + PENALTY_MS);
      setSelected(null);
      window.setTimeout(() => setWrong([]), 450);
    }
  }

  if (concepts.length < 3) {
    return <p className="text-sm text-muted">Not enough glossary terms yet — flag parts of more lectures.</p>;
  }

  const seconds = finished ?? (elapsed + penalty) / 1000;

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="inline-flex items-center gap-2 font-mono text-lg font-semibold tabular-nums text-ink">
          <Timer size={18} className="text-brand" aria-hidden />
          {seconds.toFixed(1)} s
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Trophy size={15} className="text-accent" aria-hidden />
          Best: {state.matchBest !== null ? `${state.matchBest.toFixed(1)} s` : "—"}
        </span>
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink hover:opacity-90"
        >
          <Play size={14} aria-hidden />
          {startedAt === null ? "Start" : "New round"}
        </button>
      </Card>

      {finished !== null ? (
        <p className="animate-rise rounded-xl border border-positive/40 bg-positive-soft px-4 py-3 text-sm font-medium text-ink">
          All {PAIRS} pairs in {finished.toFixed(1)} s{state.matchBest === finished ? " — a new best!" : ""} (+20 XP). Wrong picks cost 1 s each.
        </p>
      ) : null}

      {tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const done = matched.has(tile.pair);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={(event) => pick(tile, event)}
                disabled={done || !running}
                className={cn(
                  "min-h-24 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                  tile.kind === "term" ? "font-semibold text-ink" : "text-muted",
                  done && "scale-95 border-positive/30 bg-positive-soft opacity-40",
                  !done && selected?.id === tile.id && "border-brand bg-brand-soft",
                  !done && wrong.includes(tile.id) && "border-danger bg-danger-soft",
                  !done && selected?.id !== tile.id && !wrong.includes(tile.id) && "border-line bg-surface hover:border-brand/50",
                )}
              >
                {tile.text}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Six terms from the lectures you flagged, six definitions with the term hidden. Click a term, then its definition. Beat your
          best time.
        </p>
      )}
    </div>
  );
}
