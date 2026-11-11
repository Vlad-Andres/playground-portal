import { del, get, list, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const localRoot = path.join(process.cwd(), "jobs");

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localPath(key: string): string {
  return path.join(localRoot, key);
}

export async function writeStorageFile(key: string, body: BodyInit, contentType: string): Promise<void> {
  if (blobEnabled()) {
    await put(key, Buffer.from(await new Response(body).arrayBuffer()), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }
  const target = localPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await new Response(body).arrayBuffer()));
}

export async function readStorageFile(key: string): Promise<Buffer> {
  if (blobEnabled()) {
    const blob = await get(key, { access: "private" });
    if (!blob || blob.statusCode !== 200) throw new Error("Storage file was not found.");
    return Buffer.from(await new Response(blob.stream).arrayBuffer());
  }
  return fs.readFile(localPath(key));
}

export async function storageFileExists(key: string): Promise<boolean> {
  try {
    await readStorageFile(key);
    return true;
  } catch {
    return false;
  }
}

export async function deleteStorageFile(key: string): Promise<void> {
  if (blobEnabled()) {
    await del(key);
    return;
  }
  await fs.rm(localPath(key), { force: true });
}

/** Number of stored objects whose key starts with `prefix`. */
export async function countStorageKeys(prefix: string): Promise<number> {
  if (blobEnabled()) {
    let count = 0;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      count += page.blobs.length;
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return count;
  }
  try {
    const entries = await fs.readdir(localPath(prefix), { recursive: true, withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}
