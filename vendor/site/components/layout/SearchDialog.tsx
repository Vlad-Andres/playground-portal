"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CornerDownLeft, Search, X } from "lucide-react";
import { searchRecords, type SearchRecord, type SearchRecordType } from "@site/lib/search";
import { Badge, type BadgeTone } from "@site/components/ui/Badge";

const TYPE_TONE: Record<SearchRecordType, BadgeTone> = {
  lecture: "brand",
  concept: "info",
  section: "neutral",
  objective: "accent",
};

interface SearchDialogProps {
  records: SearchRecord[];
  onClose: () => void;
}

export function SearchDialog({ records, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchRecords(records, query), [records, query]);

  useEffect(() => {
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search the course"
      onClick={onClose}
    >
      <div
        className="animate-rise mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-faint" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lectures, concepts, objectives…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-sunken hover:text-ink"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {query.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              Type to search across every lecture.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              No matches for “{query}”.
            </p>
          ) : (
            <ul className="grid gap-1">
              {results.map((record) => (
                <li key={record.id}>
                  <Link
                    href={record.href}
                    onClick={onClose}
                    className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-brand-soft/50"
                  >
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-sm font-medium text-ink">{record.title}</span>
                      <span className="truncate text-xs text-faint">{record.excerpt}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={TYPE_TONE[record.type]}>{record.type}</Badge>
                      <CornerDownLeft
                        size={13}
                        className="text-faint opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
