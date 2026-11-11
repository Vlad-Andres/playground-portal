import { del, get, head, list, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

/** Key/value storage for job files. Keys look like "jobs/<id>/state.json". */
export interface Store {
  read(key: string): Promise<string | null>;
  write(key: string, body: string): Promise<void>;
  /** Write only when the key does not exist yet. Returns false when it already exists. */
  create(key: string, body: string): Promise<boolean>;
  delete(keys: string[]): Promise<void>;
  list(prefix: string): Promise<{ key: string; uploadedAt: Date }[]>;
}

function contentType(key: string): string {
  return key.endsWith(".json") ? "application/json" : "text/plain";
}

export function blobStore(): Store {
  return {
    async read(key) {
      try {
        const blob = await get(key, { access: "private" });
        if (!blob || blob.statusCode !== 200) return null;
        return await new Response(blob.stream).text();
      } catch {
        return null;
      }
    },
    async write(key, body) {
      await put(key, body, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: contentType(key) });
    },
    async create(key, body) {
      try {
        await put(key, body, { access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: contentType(key) });
        return true;
      } catch (error) {
        // The store refuses an existing pathname; anything else is a real failure.
        const exists = await head(key).then(
          () => true,
          () => false,
        );
        if (exists) return false;
        throw error;
      }
    },
    async delete(keys) {
      if (keys.length) await del(keys);
    },
    async list(prefix) {
      const result: { key: string; uploadedAt: Date }[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        result.push(...page.blobs.map((blob) => ({ key: blob.pathname, uploadedAt: blob.uploadedAt })));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return result;
    },
  };
}

/** Files under ./.data (development only). */
export function localStore(root = path.join(process.cwd(), ".data")): Store {
  const file = (key: string) => {
    const target = path.resolve(root, key);
    if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid storage key.");
    return target;
  };
  return {
    async read(key) {
      try {
        return await fs.readFile(file(key), "utf8");
      } catch {
        return null;
      }
    },
    async write(key, body) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      await fs.writeFile(file(key), body);
    },
    async create(key, body) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      try {
        await fs.writeFile(file(key), body, { flag: "wx" });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw error;
      }
    },
    async delete(keys) {
      await Promise.all(keys.map((key) => fs.rm(file(key), { force: true })));
    },
    async list(prefix) {
      const base = path.resolve(root);
      let entries: string[] = [];
      try {
        entries = (await fs.readdir(base, { recursive: true })) as string[];
      } catch {
        return [];
      }
      const result: { key: string; uploadedAt: Date }[] = [];
      for (const entry of entries) {
        const key = entry.split(path.sep).join("/");
        if (!key.startsWith(prefix)) continue;
        const stat = await fs.stat(path.join(base, entry));
        if (stat.isFile()) result.push({ key, uploadedAt: stat.mtime });
      }
      return result;
    },
  };
}

export function memoryStore(now: () => Date = () => new Date()): Store & { data: Map<string, { body: string; uploadedAt: Date }> } {
  const data = new Map<string, { body: string; uploadedAt: Date }>();
  return {
    data,
    async read(key) {
      return data.get(key)?.body ?? null;
    },
    async write(key, body) {
      data.set(key, { body, uploadedAt: now() });
    },
    async create(key, body) {
      if (data.has(key)) return false;
      data.set(key, { body, uploadedAt: now() });
      return true;
    },
    async delete(keys) {
      for (const key of keys) data.delete(key);
    },
    async list(prefix) {
      return [...data].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, uploadedAt: value.uploadedAt }));
    },
  };
}

let store: Store | null = null;

/** Blob when a token is configured, local files otherwise. */
export function defaultStore(): Store {
  store ??= process.env.BLOB_READ_WRITE_TOKEN ? blobStore() : localStore();
  return store;
}
