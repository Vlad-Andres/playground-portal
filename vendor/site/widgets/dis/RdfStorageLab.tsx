"use client";

import { useState } from "react";
import { DataTable } from "@site/components/content/DataTable";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

type Triple = [subject: string, predicate: string, object: string];

const TRIPLES: Triple[] = [
  ["1", "type", "article"],
  ["1", "title", "LAURIN"],
  ["1", "author", "Catarci"],
  ["1", "author", "Santucci"],
  ["1", "author", "Calvanese"],
  ["1", "journal", "WWW"],
  ["1", "year", "2001"],
  ["1", "file", "CSC01.pdf"],
  ["2", "type", "book"],
  ["2", "author", "Codd"],
  ["2", "title", "The Relational Model"],
  ["2", "year", "1990"],
  ["2", "publisher", "Addison-Wesley"],
  ["3", "type", "book"],
  ["3", "title", "Principles of DB Systems"],
  ["3", "author", "Vianu"],
  ["3", "author", "Hull"],
  ["3", "author", "Abiteboul"],
  ["3", "year", "1995"],
  ["3", "publisher", "Addison-Wesley"],
  ["4", "type", "article"],
  ["4", "title", "Web-Based Data"],
  ["4", "author", "Atzeni"],
  ["4", "author", "Merialdo"],
  ["4", "author", "Mecca"],
  ["4", "journal", "IEEE Int. Comp."],
  ["4", "file", "AMM02.pdf"],
];

const SUBJECTS = [...new Set(TRIPLES.map(([subject]) => subject))];
const PREDICATES = [...new Set(TRIPLES.map(([, predicate]) => predicate))];
const PROPERTY_TABLE_COLUMNS = ["type", "title", "year"];

const valueOf = (subject: string, predicate: string) =>
  TRIPLES.find(([s, p]) => s === subject && p === predicate)?.[2] ?? "NULL";

type SchemeId = "vertical" | "property" | "partitioned";

interface StoredTable {
  name: string;
  headers: string[];
  rows: string[][];
}

const SCHEMES: { id: SchemeId; label: string; tables: StoredTable[] }[] = [
  {
    id: "vertical",
    label: "Vertical table",
    tables: [{ name: "Statements", headers: ["subject", "predicate", "object"], rows: TRIPLES.map((triple) => [...triple]) }],
  },
  {
    id: "property",
    label: "Property table + excess",
    tables: [
      {
        name: "PropertyTable",
        headers: ["URI", ...PROPERTY_TABLE_COLUMNS],
        rows: SUBJECTS.map((subject) => [subject, ...PROPERTY_TABLE_COLUMNS.map((column) => valueOf(subject, column))]),
      },
      {
        name: "Excess",
        headers: ["URI", "predicate", "object"],
        rows: TRIPLES.filter(([, predicate]) => !PROPERTY_TABLE_COLUMNS.includes(predicate)).map((triple) => [...triple]),
      },
    ],
  },
  {
    id: "partitioned",
    label: "Vertical partitioning",
    tables: PREDICATES.map((predicate) => ({
      name: predicate,
      headers: ["URI", "value"],
      rows: TRIPLES.filter(([, p]) => p === predicate).map(([subject, , object]) => [subject, object]),
    })),
  },
];

interface QueryPlan {
  sql: string;
  tables: number;
  joins: number;
  note: string;
}

const QUERIES: { id: string; question: string; answer: string; plans: Record<SchemeId, QueryPlan> }[] = [
  {
    id: "calvanese",
    question: "Which publications have author Calvanese?",
    answer: "1",
    plans: {
      vertical: {
        sql: "SELECT subject FROM Statements\nWHERE predicate = 'author' AND object = 'Calvanese';",
        tables: 1,
        joins: 0,
        note: "A single-triple query: one indexed selection. This is what the vertical table is good at.",
      },
      property: {
        sql: "SELECT URI FROM Excess\nWHERE predicate = 'author' AND object = 'Calvanese';",
        tables: 1,
        joins: 0,
        note: "author is multi-valued, so it lives in the excess table — still a single selection.",
      },
      partitioned: {
        sql: "SELECT URI FROM author\nWHERE value = 'Calvanese';",
        tables: 1,
        joins: 0,
        note: "Only the author table is read; the other seven are never touched.",
      },
    },
  },
  {
    id: "title-year",
    question: "Title and year of every publication",
    answer: "LAURIN 2001 · The Relational Model 1990 · Principles of DB Systems 1995 · Web-Based Data (no year)",
    plans: {
      vertical: {
        sql: "SELECT t.subject, t.object AS title, y.object AS year\nFROM Statements t LEFT JOIN Statements y\n  ON y.subject = t.subject AND y.predicate = 'year'\nWHERE t.predicate = 'title';",
        tables: 1,
        joins: 1,
        note: "Two properties of the same resource: one self-join of Statements.",
      },
      property: {
        sql: "SELECT URI, title, year FROM PropertyTable;",
        tables: 1,
        joins: 0,
        note: "Both are clustered single-valued properties: no join at all. Resource 4 shows NULL for year.",
      },
      partitioned: {
        sql: "SELECT t.URI, t.value AS title, y.value AS year\nFROM title t LEFT JOIN year y ON y.URI = t.URI;",
        tables: 2,
        joins: 1,
        note: "One join, which is a fast merge-join when both tables are sorted by URI.",
      },
    },
  },
  {
    id: "mecca-atzeni",
    question: "In which journals did Mecca and Atzeni publish together?",
    answer: "IEEE Int. Comp.",
    plans: {
      vertical: {
        sql: "SELECT s3.object FROM Statements s1, Statements s2, Statements s3\nWHERE s1.predicate = 'author' AND s1.object = 'Mecca'\n  AND s2.predicate = 'author' AND s2.object = 'Atzeni'\n  AND s3.predicate = 'journal'\n  AND s1.subject = s2.subject AND s1.subject = s3.subject;",
        tables: 1,
        joins: 2,
        note: "Three copies of the same big table joined on subject — the classic weakness of the vertical table.",
      },
      property: {
        sql: "SELECT e3.object FROM Excess e1, Excess e2, Excess e3\nWHERE e1.predicate = 'author' AND e1.object = 'Mecca'\n  AND e2.predicate = 'author' AND e2.object = 'Atzeni'\n  AND e3.predicate = 'journal'\n  AND e1.URI = e2.URI AND e1.URI = e3.URI;",
        tables: 1,
        joins: 2,
        note: "Every property involved is in the excess table, so the property table does not help: the same self-joins.",
      },
      partitioned: {
        sql: "SELECT j.value FROM author a1, author a2, journal j\nWHERE a1.value = 'Mecca' AND a2.value = 'Atzeni'\n  AND a1.URI = a2.URI AND a1.URI = j.URI;",
        tables: 2,
        joins: 2,
        note: "Still two joins, but over the small author and journal tables only.",
      },
    },
  },
  {
    id: "all-properties",
    question: "All properties of resource 1",
    answer: "type, title, author ×3, journal, year, file",
    plans: {
      vertical: {
        sql: "SELECT predicate, object FROM Statements\nWHERE subject = '1';",
        tables: 1,
        joins: 0,
        note: "Property names are data, so one selection finds them all.",
      },
      property: {
        sql: "SELECT 'type', type FROM PropertyTable WHERE URI = '1'\nUNION ALL SELECT 'title', title FROM PropertyTable WHERE URI = '1'\nUNION ALL SELECT 'year', year FROM PropertyTable WHERE URI = '1'\nUNION ALL SELECT predicate, object FROM Excess WHERE URI = '1';",
        tables: 2,
        joins: 0,
        note: "The clustered properties are column names, so they must be listed explicitly, plus the excess table.",
      },
      partitioned: {
        sql: "SELECT 'type', value FROM type WHERE URI = '1'\nUNION ALL SELECT 'title', value FROM title WHERE URI = '1'\nUNION ALL … one SELECT per predicate table …;",
        tables: PREDICATES.length,
        joins: 0,
        note: "Property names exist only as table names: every one of the tables must be asked — the weak spot of vertical partitioning.",
      },
    },
  },
];

export function RdfStorageLab() {
  const [schemeId, setSchemeId] = useState<SchemeId>("vertical");
  const [queryId, setQueryId] = useState(QUERIES[0].id);
  const scheme = SCHEMES.find((candidate) => candidate.id === schemeId) ?? SCHEMES[0];
  const query = QUERIES.find((candidate) => candidate.id === queryId) ?? QUERIES[0];
  const plan = query.plans[schemeId];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Storage scheme</span>
          {SCHEMES.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setSchemeId(candidate.id)}
              aria-pressed={schemeId === candidate.id}
              className={cn(
                "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
                schemeId === candidate.id
                  ? "border-brand/50 bg-brand-soft text-brand-strong"
                  : "border-line bg-surface text-muted hover:border-brand/40",
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink">Query</span>
          <select
            value={queryId}
            onChange={(event) => setQueryId(event.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
          >
            {QUERIES.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.question}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tables stored" value={String(scheme.tables.length)} />
        <Stat label="Tables read" value={String(plan.tables)} tone="brand" />
        <Stat label="Joins" value={String(plan.joins)} tone={plan.joins > 0 ? "warning" : "positive"} />
        <Stat label="Answer" value={query.answer.length > 18 ? "see below" : query.answer} />
      </div>

      <pre className="overflow-x-auto rounded-xl border border-line bg-sunken p-3 font-mono text-xs leading-relaxed text-ink">
        {plan.sql}
      </pre>
      <p className="text-sm text-muted">
        {plan.note}
        {query.answer.length > 18 ? <span className="block pt-1 text-ink">Answer: {query.answer}</span> : null}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {scheme.tables.map((table) => (
          <div key={table.name} className={cn("grid gap-1.5", scheme.tables.length === 1 && "sm:col-span-2")}>
            <span className="font-mono text-xs font-medium text-faint">{table.name}</span>
            <div className="max-h-72 overflow-y-auto">
              <DataTable headers={table.headers} rows={table.rows} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
