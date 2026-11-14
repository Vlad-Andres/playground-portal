"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { LectureMeta } from "@site/content/types";
import { Card } from "@site/components/ui/Card";
import { useDifficult } from "@site/hooks/useDifficult";
import { useExamHistory } from "@site/hooks/useExamHistory";
import { useProgress } from "@site/hooks/useProgress";
import { studyNext, type StudyNextItem } from "@site/lib/studyNext";
import { quizHref, type SitePaths } from "@site/site/paths";
import { useSite } from "@site/site/context";

function hrefFor(item: StudyNextItem, paths: SitePaths, metas: LectureMeta[]) {
  if (item.kind === "flagged") return paths.difficult;
  if (item.kind === "start") return paths.lecture(item.slug);
  return quizHref(paths, metas.find((meta) => meta.slug === item.slug), item.slug);
}

/**
 * Up to three lectures to revisit, from this browser's own answers. A brand-new visitor already gets
 * "Start here" from ContinueStudying, so the panel appears only once there is something to say.
 */
export function StudyNext({ metas }: { metas: LectureMeta[] }) {
  const { data, paths } = useSite();
  const { progress } = useProgress();
  const { state } = useDifficult();
  const { history } = useExamHistory();

  const items = studyNext({ lectures: metas, progress, difficult: Object.values(state.items), exam: history[0] ?? null });
  const hasActivity = history.length > 0 || Object.keys(state.items).length > 0 || Object.values(progress).some((entry) => entry.quizTotal > 0);
  if (!hasActivity) return null;

  return (
    <Card className="grid content-start gap-4 p-5" data-study-next>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Compass size={16} className="text-brand" aria-hidden />
        Study next
      </p>

      {items.length > 0 ? (
        <ol className="grid gap-2">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={hrefFor(item, paths, metas)}
                className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/50"
              >
                <span className="grid flex-1 gap-0.5">
                  <span className="text-sm font-semibold text-ink">
                    Lecture {item.number} — {item.title}
                  </span>
                  <span className="text-xs text-muted">{item.reason}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Nothing to revisit right now.{" "}
          {data.exam ? (
            <Link href={paths.exam} className="font-medium text-brand hover:underline">
              Check yourself with a practice exam.
            </Link>
          ) : null}
        </p>
      )}

      <p className="text-xs text-faint">Based on your answers in this browser.</p>
    </Card>
  );
}
