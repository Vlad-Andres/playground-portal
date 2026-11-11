"use client";

import { useState } from "react";
import { DataTable } from "@site/components/content/DataTable";
import { cn } from "@site/lib/cn";

interface GraphNode {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

const NODE_WIDTH = 132;
const NODE_HEIGHT = 34;

const NODES: GraphNode[] = [
  { id: "shakespeare", label: "Author", text: "Shakespeare", x: 410, y: 30 },
  { id: "theTempest", label: "Play", text: "The Tempest", x: 230, y: 115 },
  { id: "juliusCaesar", label: "Play", text: "Julius Caesar", x: 590, y: 115 },
  { id: "production2", label: "Production", text: "The Tempest", x: 230, y: 205 },
  { id: "production1", label: "Production", text: "Julius Caesar", x: 590, y: 205 },
  { id: "rsc", label: "Company", text: "RSC", x: 410, y: 280 },
  { id: "billy", label: "User", text: "Billy", x: 790, y: 205 },
  { id: "review", label: "Review", text: "rating: 5", x: 790, y: 300 },
  { id: "performance2", label: "Performance", text: "20061121", x: 230, y: 370 },
  { id: "performance3", label: "Performance", text: "20120730", x: 430, y: 370 },
  { id: "performance1", label: "Performance", text: "20120729", x: 630, y: 370 },
  { id: "theatreRoyal", label: "Venue", text: "Theatre Royal", x: 430, y: 460 },
  { id: "greyStreet", label: "Street", text: "Grey Street", x: 650, y: 460 },
  { id: "newcastle", label: "City", text: "Newcastle", x: 790, y: 545 },
  { id: "tyneAndWear", label: "County", text: "Tyne and Wear", x: 560, y: 545 },
  { id: "england", label: "Country", text: "England", x: 330, y: 545 },
  { id: "stratford", label: "City", text: "Stratford", x: 90, y: 460 },
];

const EDGES: GraphEdge[] = [
  { from: "shakespeare", to: "juliusCaesar", type: "WROTE_PLAY {year:1599}" },
  { from: "shakespeare", to: "theTempest", type: "WROTE_PLAY {year:1610}" },
  { from: "rsc", to: "production1", type: "PRODUCED" },
  { from: "rsc", to: "production2", type: "PRODUCED" },
  { from: "production1", to: "juliusCaesar", type: "PRODUCTION_OF" },
  { from: "production2", to: "theTempest", type: "PRODUCTION_OF" },
  { from: "performance1", to: "production1", type: "PERFORMANCE_OF" },
  { from: "performance3", to: "production1", type: "PERFORMANCE_OF" },
  { from: "performance2", to: "production2", type: "PERFORMANCE_OF" },
  { from: "billy", to: "review", type: "WROTE_REVIEW" },
  { from: "review", to: "performance1", type: "REVIEW_OF" },
  { from: "performance1", to: "theatreRoyal", type: "VENUE" },
  { from: "performance2", to: "theatreRoyal", type: "VENUE" },
  { from: "performance3", to: "theatreRoyal", type: "VENUE" },
  { from: "theatreRoyal", to: "greyStreet", type: "STREET" },
  { from: "greyStreet", to: "newcastle", type: "CITY" },
  { from: "newcastle", to: "tyneAndWear", type: "COUNTY" },
  { from: "tyneAndWear", to: "england", type: "COUNTRY" },
  { from: "stratford", to: "england", type: "COUNTRY" },
  { from: "rsc", to: "stratford", type: "BASED_IN" },
  { from: "shakespeare", to: "stratford", type: "BORN_IN" },
];

interface Query {
  id: string;
  title: string;
  cypher: string;
  /** Each matched path as a list of node ids; consecutive ids share an edge. */
  paths: string[][];
  headers: string[];
  rows: string[][];
  note: string;
}

const THEATRE_ANCHORS = `MATCH (theater:Venue {name:'Theatre Royal'}),
      (newcastle:City {name:'Newcastle'}),
      (bard:Author {lastname:'Shakespeare'}),`;

const QUERIES: Query[] = [
  {
    id: "plays",
    title: "Shakespeare plays performed at Newcastle's Theatre Royal",
    cypher: `${THEATRE_ANCHORS}
      (newcastle)<-[:STREET|CITY*1..2]-(theater)
        <-[:VENUE]-()-[:PERFORMANCE_OF]->()
        -[:PRODUCTION_OF]->(play)<-[:WROTE_PLAY]-(bard)
RETURN DISTINCT play.title AS play`,
    paths: [
      ["newcastle", "greyStreet", "theatreRoyal", "performance1", "production1", "juliusCaesar", "shakespeare"],
      ["newcastle", "greyStreet", "theatreRoyal", "performance3", "production1", "juliusCaesar", "shakespeare"],
      ["newcastle", "greyStreet", "theatreRoyal", "performance2", "production2", "theTempest", "shakespeare"],
    ],
    headers: ["play"],
    rows: [["Julius Caesar"], ["The Tempest"]],
    note: "Three anchored nodes (bound by label and property), a variable-length path of STREET or CITY relationships, and two anonymous nodes (). The pattern matches three times — Julius Caesar was performed twice — so without DISTINCT the result would contain Julius Caesar twice.",
  },
  {
    id: "late",
    title: "…only plays from the late period (written after 1608)",
    cypher: `${THEATRE_ANCHORS}
      (newcastle)<-[:STREET|CITY*1..2]-(theater)
        <-[:VENUE]-()-[:PERFORMANCE_OF]->()
        -[:PRODUCTION_OF]->(play)<-[w:WROTE_PLAY]-(bard)
WHERE w.year > 1608
RETURN DISTINCT play.title AS play`,
    paths: [["newcastle", "greyStreet", "theatreRoyal", "performance2", "production2", "theTempest", "shakespeare"]],
    headers: ["play"],
    rows: [["The Tempest"]],
    note: "The WROTE_PLAY relationship is bound to the identifier w (before the colon), so WHERE can test its year property. Julius Caesar (1599) fails the predicate and drops out.",
  },
  {
    id: "count",
    title: "Rank the plays by number of performances",
    cypher: `${THEATRE_ANCHORS}
      (newcastle)<-[:STREET|CITY*1..2]-(theater)
        <-[:VENUE]-()-[p:PERFORMANCE_OF]->()
        -[:PRODUCTION_OF]->(play)<-[:WROTE_PLAY]-(bard)
RETURN   play.title AS play, count(p) AS performance_count
ORDER BY performance_count DESC`,
    paths: [
      ["newcastle", "greyStreet", "theatreRoyal", "performance1", "production1", "juliusCaesar", "shakespeare"],
      ["newcastle", "greyStreet", "theatreRoyal", "performance3", "production1", "juliusCaesar", "shakespeare"],
      ["newcastle", "greyStreet", "theatreRoyal", "performance2", "production2", "theTempest", "shakespeare"],
    ],
    headers: ["play", "performance_count"],
    rows: [
      ["Julius Caesar", "2"],
      ["The Tempest", "1"],
    ],
    note: "count(p) aggregates the PERFORMANCE_OF relationships per play — the non-aggregated play.title acts as the grouping key, like GROUP BY in SQL. AS renames a column; ORDER BY … DESC sorts.",
  },
  {
    id: "with",
    title: "Plays as one list, latest first (WITH and collect)",
    cypher: `MATCH (bard:Author {lastname:'Shakespeare'})-[w:WROTE_PLAY]->(play)
WITH play
ORDER BY w.year DESC
RETURN collect(play.title) AS plays`,
    paths: [
      ["shakespeare", "theTempest"],
      ["shakespeare", "juliusCaesar"],
    ],
    headers: ["plays"],
    rows: [['["The Tempest", "Julius Caesar"]']],
    note: "WITH pipes the results of one query part into the next, like a Unix pipe. Here it orders the plays before RETURN folds them into a single list with collect.",
  },
  {
    id: "review",
    title: "Who reviewed which performance, and where?",
    cypher: `MATCH (u:User)-[:WROTE_REVIEW]->(r:Review)
      -[:REVIEW_OF]->(perf:Performance)-[:VENUE]->(v:Venue)
RETURN u.name, r.rating, perf.date, v.name`,
    paths: [["billy", "review", "performance1", "theatreRoyal"]],
    headers: ["u.name", "r.rating", "perf.date", "v.name"],
    rows: [["Billy", "5", "20120729", "Theatre Royal"]],
    note: "A review is a node of its own (with rating and text), not a property of a relationship: it can be connected both to its author and to the performance it is about.",
  },
  {
    id: "cross",
    title: "Cross-domain: the company based in the author's birthplace",
    cypher: `MATCH (a:Author)-[:BORN_IN]->(c:City)<-[:BASED_IN]-(co:Company)
RETURN a.lastname, c.name, co.name`,
    paths: [["shakespeare", "stratford", "rsc"]],
    headers: ["a.lastname", "c.name", "co.name"],
    rows: [["Shakespeare", "Stratford upon Avon", "RSC"]],
    note: "Stratford upon Avon belongs to all three domains — literary (BORN_IN), theatrical (BASED_IN) and geospatial (COUNTRY). Joining domains is just following relationships.",
  },
  {
    id: "path",
    title: "Path length from the theatre up to its country",
    cypher: `MATCH p = (t:Venue {name:'Theatre Royal'})-[*1..4]->(c:Country)
RETURN c.name, length(p)`,
    paths: [["theatreRoyal", "greyStreet", "newcastle", "tyneAndWear", "england"]],
    headers: ["c.name", "length(p)"],
    rows: [["England", "4"]],
    note: "An unnamed, untyped variable-length relationship [*1..4] follows any outgoing relationships. Binding the whole path to p lets RETURN compute length(p), the number of relationships.",
  },
];

function nodeById(id: string) {
  const node = NODES.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown node ${id}`);
  return node;
}

function edgeKey(edge: GraphEdge) {
  return `${edge.from}->${edge.to}`;
}

function matchedEdgeKeys(paths: string[][]) {
  const keys = new Set<string>();
  for (const path of paths) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const [a, b] = [path[index], path[index + 1]];
      const edge = EDGES.find(
        (candidate) => (candidate.from === a && candidate.to === b) || (candidate.from === b && candidate.to === a),
      );
      if (edge) keys.add(edgeKey(edge));
    }
  }
  return keys;
}

/** Point where the segment from the centre of `node` towards (tx, ty) leaves its rectangle. */
function borderPoint(node: GraphNode, tx: number, ty: number) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  const scale = Math.min(
    dx === 0 ? Infinity : NODE_WIDTH / 2 / Math.abs(dx),
    dy === 0 ? Infinity : NODE_HEIGHT / 2 / Math.abs(dy),
  );
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

export function CypherShakespeareLab() {
  const [queryId, setQueryId] = useState(QUERIES[0].id);
  const query = QUERIES.find((candidate) => candidate.id === queryId) ?? QUERIES[0];
  const activeNodes = new Set(query.paths.flat());
  const activeEdges = matchedEdgeKeys(query.paths);

  return (
    <div className="grid gap-5">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-ink">Query</span>
        <select
          value={queryId}
          onChange={(event) => setQueryId(event.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
        >
          {QUERIES.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title}
            </option>
          ))}
        </select>
      </label>

      <pre className="overflow-x-auto rounded-xl border border-line bg-sunken p-3 font-mono text-xs leading-relaxed text-ink">
        {query.cypher}
      </pre>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <svg
          viewBox="0 0 880 580"
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label={`Shakespeare graph with the nodes matched by: ${query.title}`}
        >
          <defs>
            <marker id="cypher-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" className="fill-[var(--line-strong)]" />
            </marker>
            <marker id="cypher-arrow-active" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" className="fill-[var(--brand)]" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const from = nodeById(edge.from);
            const to = nodeById(edge.to);
            const start = borderPoint(from, to.x, to.y);
            const end = borderPoint(to, from.x, from.y);
            const active = activeEdges.has(edgeKey(edge));
            return (
              <g key={edgeKey(edge)}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  strokeWidth={active ? 2.5 : 1.2}
                  className={active ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]"}
                  markerEnd={active ? "url(#cypher-arrow-active)" : "url(#cypher-arrow)"}
                />
                <text
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 3}
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[9px]",
                    active ? "fill-[var(--brand-strong)] font-semibold" : "fill-[var(--faint)]",
                  )}
                >
                  {edge.type}
                </text>
              </g>
            );
          })}

          {NODES.map((node) => {
            const active = activeNodes.has(node.id);
            return (
              <g key={node.id}>
                <rect
                  x={node.x - NODE_WIDTH / 2}
                  y={node.y - NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  strokeWidth={active ? 2 : 1}
                  className={
                    active
                      ? "fill-[var(--brand-soft)] stroke-[var(--brand)]"
                      : "fill-[var(--sunken)] stroke-[var(--line-strong)]"
                  }
                />
                <text x={node.x} y={node.y - 3} textAnchor="middle" className="fill-[var(--faint)] text-[9px] font-semibold">
                  :{node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  className={cn("text-[11px]", active ? "fill-[var(--ink)] font-semibold" : "fill-[var(--muted)]")}
                >
                  {node.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-start">
        <DataTable headers={query.headers} rows={query.rows} caption={`${query.rows.length} row${query.rows.length === 1 ? "" : "s"}`} />
        <p className="text-sm text-muted">{query.note}</p>
      </div>
    </div>
  );
}
