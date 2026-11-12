/** One structured line per event on the server's stdout. Never pass secrets or user text. */
export function logEvent(event: string, fields: Record<string, string | number | boolean | undefined> = {}): void {
  const line: Record<string, string | number | boolean> = { ts: new Date().toISOString(), event };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) line[key] = value;
  }
  console.log(JSON.stringify(line));
}

/** An error message as it may appear in a log line: never longer than 200 characters. */
export function logMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 200);
}
