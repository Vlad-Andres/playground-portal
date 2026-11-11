"use client";

import { useState, type KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, Pencil, Play, RotateCcw } from "lucide-react";
import { ENGINE_LABEL, GRAPH_CONTENTS, GREMLIN_CONTENTS, SQL_TABLES } from "@site/lib/runner/datasets";
import type { RunLanguage, RunOutput, RunResult } from "@site/lib/runner/types";
import { cn } from "@site/lib/cn";

const MAX_ROWS = 50;

interface RunnableCodeProps {
  lang: RunLanguage;
  /** The code as the lecture shows it. */
  code: string;
  /** What actually runs, when the shown code needs adapting (e.g. Umbra SQL → PostgreSQL). */
  runCode?: string;
  /** Why the runnable version differs, or what to try. */
  note?: string;
  hint?: string;
  /** Syntax-highlighted HTML of `code`, rendered at build time. */
  html?: string;
  caption?: string;
}

let sqlStarted = false;

async function execute(lang: RunLanguage, code: string): Promise<RunResult> {
  if (lang === "sql") {
    const { runSql } = await import("@site/lib/runner/sql");
    return runSql(code);
  }
  if (lang === "cypher") {
    const [{ executeCypher }, { courseGraph }] = await Promise.all([import("@site/lib/runner/cypher"), import("@site/lib/runner/courseGraph")]);
    return executeCypher(courseGraph(), code);
  }
  const { runGremlin } = await import("@site/lib/runner/gremlin");
  return runGremlin(code);
}

function OutputView({ output }: { output: RunOutput }) {
  return (
    <div className="grid gap-1.5">
      {output.title ? <p className="truncate font-mono text-[11px] text-faint">{output.title}</p> : null}
      {output.kind === "message" ? (
        <p className="flex items-center gap-1.5 text-sm text-positive">
          <CheckCircle2 size={14} aria-hidden /> {output.text}
        </p>
      ) : output.kind === "lines" ? (
        <pre className="max-h-96 overflow-auto rounded-lg border border-line bg-surface p-3 font-mono text-xs leading-relaxed text-ink">
          {output.lines.join("\n")}
        </pre>
      ) : (
        <div className="grid gap-1">
          <div className="max-h-96 overflow-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse font-mono text-xs">
              <thead className="sticky top-0 bg-sunken">
                <tr>
                  {output.columns.map((column, index) => (
                    <th key={index} className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap text-ink">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {output.rows.slice(0, MAX_ROWS).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-line">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2.5 py-1.5 align-top text-muted">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-faint">
            {output.rows.length} row{output.rows.length === 1 ? "" : "s"}
            {output.rows.length > MAX_ROWS ? ` — showing the first ${MAX_ROWS}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function DataInfo({ lang }: { lang: RunLanguage }) {
  const entries =
    lang === "sql"
      ? SQL_TABLES.map((table) => ({ name: `${table.name}(${table.columns})`, about: table.about }))
      : lang === "cypher"
        ? GRAPH_CONTENTS
        : GREMLIN_CONTENTS;
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
      <p className="font-medium text-ink">
        {lang === "sql" ? "Sample database" : lang === "cypher" ? "Sample graph (all course examples)" : "Starting graph"}
      </p>
      <ul className="grid gap-0.5">
        {entries.map((entry) => (
          <li key={entry.name} className="text-muted">
            <span className="font-mono text-ink">{entry.name}</span> — {entry.about}
          </li>
        ))}
      </ul>
      <p className="text-faint">Every run starts from this data: whatever a run creates, changes or deletes is undone afterwards.</p>
    </div>
  );
}

export function RunnableCode({ lang, code, runCode, note, hint, html, caption }: RunnableCodeProps) {
  const initial = (runCode ?? code).trim();
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showData, setShowData] = useState(false);
  const edited = text !== initial;

  async function run() {
    setRunning(true);
    setStatus(lang === "sql" && !sqlStarted ? "Starting PostgreSQL in your browser — the first run downloads about 4 MB…" : null);
    try {
      const outcome = await execute(lang, text);
      if (lang === "sql") sqlStarted = true;
      setResult(outcome);
    } catch (error) {
      setResult({ outputs: [], error: { message: error instanceof Error ? error.message : String(error) }, ms: 0 });
    } finally {
      setRunning(false);
      setStatus(null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void run();
    } else if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd } = target;
      const next = `${text.slice(0, selectionStart)}  ${text.slice(selectionEnd)}`;
      setText(next);
      requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  }

  const showEditor = editing || edited || !html;

  return (
    <figure className="grid gap-2" data-assistant-ignore={editing ? "" : undefined}>
      <div className="overflow-hidden rounded-xl border border-line bg-sunken">
        {showEditor ? (
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setEditing(true)}
            spellCheck={false}
            aria-label={`${lang.toUpperCase()} code — edit and press Run`}
            rows={Math.min(30, text.split("\n").length + 1)}
            className="block w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-ink outline-none"
          />
        ) : (
          <div className="overflow-x-auto p-4 text-sm [&_pre]:bg-transparent!" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/60 px-3 py-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-brand-ink hover:opacity-90 disabled:opacity-60"
          >
            {running ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Play size={13} aria-hidden />}
            Run
          </button>
          {html ? (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              aria-pressed={editing}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                editing ? "border-brand/50 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:border-brand/40",
              )}
            >
              <Pencil size={12} aria-hidden />
              {editing ? "Editing" : "Edit"}
            </button>
          ) : null}
          {edited ? (
            <button
              type="button"
              onClick={() => {
                setText(initial);
                setEditing(false);
                setResult(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-brand/40"
            >
              <RotateCcw size={12} aria-hidden />
              Reset
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowData((value) => !value)}
            aria-pressed={showData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-brand/40"
          >
            <Database size={12} aria-hidden />
            Data
          </button>
          <span className="ml-auto text-[11px] text-faint">
            {ENGINE_LABEL[lang]}
            {editing ? " · Ctrl/⌘ + Enter runs" : ""}
          </span>
        </div>
      </div>

      {runCode !== undefined && note ? (
        <p className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-xs text-ink">
          <span className="font-semibold">Runs an adapted version.</span> {note}{" "}
          {html ? (
            <button type="button" onClick={() => setEditing(true)} className="font-medium text-brand underline">
              Show it
            </button>
          ) : null}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-muted">💡 Try: {hint}</p> : null}
      {caption ? <figcaption className="text-xs text-faint">{caption}</figcaption> : null}
      {showData ? <DataInfo lang={lang} /> : null}
      {status ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 size={13} className="animate-spin" aria-hidden /> {status}
        </p>
      ) : null}

      {result ? (
        <div className="animate-rise grid gap-3 rounded-xl border border-line bg-sunken/60 p-3">
          {result.outputs.map((output, index) => (
            <OutputView key={index} output={output} />
          ))}
          {result.error ? (
            <div className="grid gap-1 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-danger">
                <AlertTriangle size={14} aria-hidden /> Error
              </p>
              <p className="font-mono text-xs text-ink">{result.error.message}</p>
              {result.error.statement ? (
                <p className="truncate font-mono text-[11px] text-faint">in: {result.error.statement.split("\n")[0]}</p>
              ) : null}
            </div>
          ) : null}
          <p className="text-[11px] text-faint">
            Ran in {result.ms < 1 ? "<1" : Math.round(result.ms)} ms · changes are undone after each run
          </p>
        </div>
      ) : null}
    </figure>
  );
}
