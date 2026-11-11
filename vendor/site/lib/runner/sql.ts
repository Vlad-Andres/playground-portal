import type { PGlite } from "@electric-sql/pglite";
import { SQL_SETUP } from "@site/lib/runner/sqlDataset";
import type { RunOutput, RunResult } from "@site/lib/runner/types";

let database: Promise<PGlite> | null = null;

type PGliteModule = typeof import("@electric-sql/pglite");
type PgvectorModule = typeof import("@electric-sql/pglite-pgvector");

/**
 * One in-browser PostgreSQL per page, created on the first Run and filled with the sample data.
 * PGlite is loaded from public/pglite/ at runtime (see scripts/copy-pglite.mjs), not bundled.
 */
function getDatabase() {
  database ??= (async () => {
    const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pglite`;
    const [{ PGlite }, { vector }] = (await Promise.all([
      import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}/index.js`),
      import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}/vector/index.js`),
    ])) as [PGliteModule, PgvectorModule];
    const db = await PGlite.create({ extensions: { vector } });
    await db.exec(SQL_SETUP);
    return db;
  })();
  database.catch(() => {
    database = null;
  });
  return database;
}

export function warmUpSql() {
  return getDatabase();
}

function show(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return `{${value.map(show).join(",")}}`;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number" && !Number.isInteger(value)) return String(Math.round(value * 1e6) / 1e6);
  if (typeof value === "string" && /^-?\d+\.\d{7,}$/.test(value)) return String(Math.round(Number(value) * 1e6) / 1e6);
  return String(value);
}

/** Runs the snippet in a transaction that is always rolled back, so every run sees the same data. */
export async function runSql(code: string): Promise<RunResult> {
  const db = await getDatabase();
  const started = performance.now();
  await db.exec("begin");
  try {
    const results = await db.exec(code);
    const outputs: RunOutput[] = results.map((result) =>
      result.fields.length > 0
        ? {
            kind: "table",
            columns: result.fields.map((field) => field.name),
            rows: result.rows.map((row) => result.fields.map((field) => show((row as Record<string, unknown>)[field.name]))),
          }
        : { kind: "message", text: result.affectedRows ? `OK — ${result.affectedRows} row${result.affectedRows === 1 ? "" : "s"} affected` : "OK" },
    );
    return { outputs, ms: performance.now() - started };
  } catch (error) {
    return { outputs: [], error: { message: error instanceof Error ? error.message : String(error) }, ms: performance.now() - started };
  } finally {
    await db.exec("rollback").catch(() => undefined);
  }
}
