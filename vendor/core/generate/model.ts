export interface ModelRequest {
  system: string;
  user: string;
  maxOutputTokens: number;
}

export interface ModelReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelClient {
  complete(request: ModelRequest): Promise<ModelReply>;
}

function stripFences(text: string): string {
  const fenced = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/.exec(text);
  return (fenced ? fenced[1] : text).trim();
}

/** Index just past the JSON value that starts at `start`, honouring strings and escapes. */
function valueEnd(text: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") stack.push(char === "{" ? "}" : "]");
    else if (char === "}" || char === "]") {
      if (stack.pop() !== char) return -1;
      if (stack.length === 0) return index + 1;
    }
  }
  return -1;
}

/** Parse the first JSON object or array in a model reply, ignoring fences and surrounding prose. */
export function extractJson(text: string): unknown {
  const body = stripFences(text);
  try {
    return JSON.parse(body);
  } catch {
    // fall through to scanning
  }
  for (let start = 0; start < body.length; start += 1) {
    if (body[start] !== "{" && body[start] !== "[") continue;
    const end = valueEnd(body, start);
    if (end < 0) continue;
    try {
      return JSON.parse(body.slice(start, end));
    } catch {
      // try the next opening bracket
    }
  }
  throw new Error("not JSON");
}

export class BudgetExceeded extends Error {
  constructor(message = "Generation budget reached.") {
    super(message);
    this.name = "BudgetExceeded";
  }
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export class Budget {
  private readonly totals: Usage = { inputTokens: 0, outputTokens: 0, calls: 0 };

  constructor(private readonly limits: { inputTokens: number; outputTokens: number }) {}

  add(reply: Pick<ModelReply, "inputTokens" | "outputTokens">): void {
    this.totals.inputTokens += reply.inputTokens;
    this.totals.outputTokens += reply.outputTokens;
    this.totals.calls += 1;
    if (this.totals.inputTokens > this.limits.inputTokens || this.totals.outputTokens > this.limits.outputTokens) {
      throw new BudgetExceeded();
    }
  }

  /** True when another call could still fit (used before calling). */
  get exhausted(): boolean {
    return this.totals.inputTokens >= this.limits.inputTokens || this.totals.outputTokens >= this.limits.outputTokens;
  }

  get used(): Usage {
    return { ...this.totals };
  }
}

export function withBudget(client: ModelClient, budget: Budget): ModelClient {
  return {
    async complete(request) {
      if (budget.exhausted) throw new BudgetExceeded();
      const reply = await client.complete(request);
      budget.add(reply);
      return reply;
    },
  };
}

/** Rough token estimate (≈4 characters per token) for fakes and logs. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function fakeModel(answer: (request: ModelRequest) => string): ModelClient {
  return {
    async complete(request) {
      const text = answer(request);
      return { text, inputTokens: estimateTokens(request.system + request.user), outputTokens: estimateTokens(text) };
    },
  };
}
