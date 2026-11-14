"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { siteFeatures } from "@core/site";
import { formatDue } from "@site/components/difficult/kit";
import { Card } from "@site/components/ui/Card";
import { useDifficult } from "@site/hooks/useDifficult";
import { dueSummary } from "@site/lib/difficult";
import { useSite } from "@site/site/context";

function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** "N cards due today" with one tap into the review session; hidden until something is flagged. */
export function DueToday() {
  const { data, paths } = useSite();
  const { state } = useDifficult();
  const now = useMinuteClock();
  if (!siteFeatures(data.course).difficult) return null;

  const { total, due, nextDue } = dueSummary(Object.values(state.items), now);
  if (total === 0) return null;

  return (
    <Card className="flex flex-wrap items-center gap-4 p-5" data-due-today>
      <CalendarClock size={24} className="shrink-0 text-brand" aria-hidden />
      <span className="grid min-w-48 flex-1 gap-0.5">
        <span className="text-base font-semibold text-ink">
          {due > 0 ? `${due} ${due === 1 ? "card" : "cards"} due today` : "All caught up"}
        </span>
        <span className="text-sm text-muted">
          {due > 0
            ? "Parts you marked as difficult, scheduled so they stick."
            : nextDue !== null
              ? `Next review ${formatDue(nextDue, now)}.`
              : `${total} marked as difficult.`}
        </span>
      </span>
      {due > 0 ? (
        <Link
          href={`${paths.difficult}#review`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
        >
          Start review
          <ArrowRight size={15} aria-hidden />
        </Link>
      ) : null}
    </Card>
  );
}
