// Serves PGlite (PostgreSQL compiled to WebAssembly) and pgvector as the packages publish them:
// they are copied into public/pglite/ and imported at runtime, outside the bundler, whose
// production minifier breaks PGlite's WebAssembly loading.
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const PGLITE = "node_modules/@electric-sql/pglite/dist";
const PGVECTOR = "node_modules/@electric-sql/pglite-pgvector/dist";
const TARGET = "public/pglite";

async function copyMatching(from, to, keep) {
  await mkdir(to, { recursive: true });
  let count = 0;
  for (const name of await readdir(from)) {
    if (!keep(name)) continue;
    await copyFile(path.join(from, name), path.join(to, name));
    count += 1;
  }
  return count;
}

const runtime = (name) => /\.js$/.test(name) || ["pglite.wasm", "pglite.data", "initdb.wasm"].includes(name);
let copied = await copyMatching(PGLITE, TARGET, runtime);
copied += await copyMatching(path.join(PGLITE, "fs"), path.join(TARGET, "fs"), (name) => name.endsWith(".js"));
copied += await copyMatching(PGVECTOR, path.join(TARGET, "vector"), (name) => name === "index.js" || name === "vector.tar.gz");
console.log(`Copied ${copied} PGlite files to ${TARGET}`);
