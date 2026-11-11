export type RunLanguage = "sql" | "cypher" | "gremlin";

export type RunOutput =
  | { kind: "table"; title?: string; columns: string[]; rows: string[][] }
  | { kind: "message"; title?: string; text: string }
  | { kind: "lines"; title?: string; lines: string[] };

export interface RunResult {
  outputs: RunOutput[];
  error?: { message: string; statement?: string };
  ms: number;
}

/** The engine for a code-block language, or null when the language cannot run here. */
export function runLanguage(lang: string): RunLanguage | null {
  const lower = lang.toLowerCase();
  if (lower === "sql" || lower === "postgresql" || lower === "postgres") return "sql";
  if (lower === "cypher") return "cypher";
  if (lower === "groovy" || lower === "gremlin") return "gremlin";
  return null;
}
