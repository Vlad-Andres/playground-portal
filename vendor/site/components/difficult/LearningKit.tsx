"use client";

import { useMemo, useState } from "react";
import { Brain, Layers, ListChecks, Network, PenLine, TextCursorInput } from "lucide-react";
import { ClozeDrill } from "@site/components/difficult/ClozeDrill";
import { ConceptMap } from "@site/components/difficult/ConceptMap";
import { FlipCards } from "@site/components/difficult/FlipCards";
import { MiniQuiz } from "@site/components/difficult/MiniQuiz";
import {
  clozeSentences,
  contextFor,
  extractTerms,
  flashcardsFor,
  relatedQuestions,
  type ResolvedItem,
} from "@site/components/difficult/kit";
import { useDifficult } from "@site/hooks/useDifficult";
import { cn } from "@site/lib/cn";

const TOOLS = [
  { id: "map", label: "Concept map", icon: Network },
  { id: "cloze", label: "Fill the gaps", icon: TextCursorInput },
  { id: "cards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Test yourself", icon: ListChecks },
  { id: "explain", label: "Explain it", icon: PenLine },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

export function LearningKit({ resolved }: { resolved: ResolvedItem }) {
  const [tool, setTool] = useState<ToolId>("map");
  const { setNote } = useDifficult();
  const [draft, setDraft] = useState(resolved.item.note);

  const kit = useMemo(() => {
    const terms = extractTerms(resolved.text, resolved.lecture.concepts);
    return {
      nodes: terms.map((term) => ({ term, detail: contextFor(term, resolved.text, resolved.lecture.concepts) })),
      cloze: clozeSentences(resolved.text),
      cards: flashcardsFor(resolved, terms),
      quiz: relatedQuestions(resolved.lecture, terms),
    };
  }, [resolved]);

  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-sunken/50 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Brain size={16} className="mr-1 text-brand" aria-hidden />
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            aria-pressed={tool === id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              tool === id ? "border-brand/50 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:border-brand/40",
            )}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tool === "map" ? <ConceptMap center={resolved.sectionTitle} nodes={kit.nodes} /> : null}
      {tool === "cloze" ? <ClozeDrill sentences={kit.cloze} /> : null}
      {tool === "cards" ? <FlipCards cards={kit.cards} /> : null}
      {tool === "quiz" ? <MiniQuiz questions={kit.quiz} /> : null}
      {tool === "explain" ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted">
            The Feynman technique: explain this part in your own words, as if to a classmate who missed the lecture. Gaps in your
            explanation are exactly what to reread. Your note is saved in this browser and shown again during review.
          </p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => setNote(resolved.item.key, draft)}
            rows={5}
            placeholder="In my own words…"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand/60"
          />
          <p className="text-xs text-faint">Saved when you click outside the box.</p>
        </div>
      ) : null}
    </div>
  );
}
