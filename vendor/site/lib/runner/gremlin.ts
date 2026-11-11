/**
 * A tiny Gremlin (TinkerPop 2 / Groovy console) interpreter for the traversals of the course,
 * over the wine graph of Seven Databases in Seven Weeks. Not real Groovy: only pipelines.
 */
import type { RunResult } from "@site/lib/runner/types";

type Primitive = string | number | boolean | null;
type Elem = { t: "v"; id: number } | { t: "e"; id: number } | { t: "map"; entries: [string, Primitive][] } | Primitive;

interface Vertex {
  id: number;
  props: Record<string, Primitive>;
}
interface Edge {
  id: number;
  out: number;
  in: number;
  label: string;
  props: Record<string, Primitive>;
}

class GremlinError extends Error {}

class WineGraph {
  vertices = new Map<number, Vertex>();
  edges = new Map<number, Edge>();
  private nextV = 0;
  private nextE = 0;

  addVertex(props: Record<string, Primitive>) {
    const vertex = { id: this.nextV++, props };
    this.vertices.set(vertex.id, vertex);
    return vertex;
  }
  addEdge(out: number, into: number, label: string) {
    const edge = { id: this.nextE++, out, in: into, label, props: {} };
    this.edges.set(edge.id, edge);
    return edge;
  }
}

/** The graph as the book's first Gremlin examples see it: three vertices, two edges. */
export function wineGraph() {
  const graph = new WineGraph();
  const ice = graph.addVertex({ name: "Prancing Wolf Ice Wine 2007" });
  const magazine = graph.addVertex({ name: "Wine Expert Monthly" });
  const riesling = graph.addVertex({ name: "riesling" });
  graph.addEdge(magazine.id, ice.id, "reported_on");
  graph.addEdge(ice.id, riesling.id, "grape_type");
  return graph;
}

/* ── tokens ── */
interface Tok {
  t: "id" | "num" | "str" | "p" | "eof";
  v: string;
}

function lex(source: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      tokens.push({ t: "id", v: source.slice(start, i) });
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i;
      while (i < source.length && /[0-9.]/.test(source[i])) i += 1;
      tokens.push({ t: "num", v: source.slice(start, i) });
      continue;
    }
    if (c === "'" || c === '"') {
      const close = source.indexOf(c, i + 1);
      if (close < 0) throw new GremlinError("Unterminated string");
      tokens.push({ t: "str", v: source.slice(i + 1, close) });
      i = close + 1;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) {
      tokens.push({ t: "p", v: two });
      i += 2;
      continue;
    }
    if ("()[]{},.:=!<>".includes(c)) {
      tokens.push({ t: "p", v: c });
      i += 1;
      continue;
    }
    throw new GremlinError(`Unexpected character '${c}'`);
  }
  tokens.push({ t: "eof", v: "" });
  return tokens;
}

type Env = Map<string, Elem[]>;

class Interpreter {
  private tokens: Tok[] = [];
  private i = 0;

  constructor(
    private readonly graph: WineGraph,
    private readonly env: Env,
  ) {}

  private peek(offset = 0) {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)];
  }
  private isP(value: string, offset = 0) {
    const token = this.peek(offset);
    return token.t === "p" && token.v === value;
  }
  private expectP(value: string) {
    if (!this.isP(value)) throw new GremlinError(`Expected '${value}'`);
    this.i += 1;
  }

  statement(source: string): Elem[] {
    this.tokens = lex(source);
    this.i = 0;
    let target: string | null = null;
    if (this.peek().t === "id" && this.isP("=", 1) && !this.isP("=", 2)) {
      target = this.peek().v;
      this.i += 2;
    }
    const result = this.chain();
    if (this.peek().t !== "eof") throw new GremlinError(`Unexpected '${this.peek().v}'`);
    if (target) this.env.set(target, result);
    return result;
  }

  private chain(): Elem[] {
    const base = this.peek();
    if (base.t === "str") {
      this.i += 1;
      return [base.v];
    }
    if (base.t === "num") {
      this.i += 1;
      return [Number(base.v)];
    }
    if (base.t !== "id") throw new GremlinError("Expected g or a variable");
    this.i += 1;
    let pipe: Elem[] | "g";
    if (base.v === "g") pipe = "g";
    else {
      const value = this.env.get(base.v);
      if (!value) throw new GremlinError(`No such property: ${base.v}`);
      pipe = value;
    }
    while (this.isP(".")) {
      this.i += 1;
      const step = this.peek();
      if (step.t !== "id") throw new GremlinError("Expected a step after '.'");
      this.i += 1;
      const args = this.isP("(") ? this.args() : null;
      const closure = this.isP("{") ? this.closure() : null;
      pipe = this.step(pipe, step.v, args ?? [], closure);
    }
    if (pipe === "g") return [];
    return pipe;
  }

  private args(): Elem[][] {
    this.expectP("(");
    const args: Elem[][] = [];
    while (!this.isP(")")) {
      if (this.isP("[")) args.push([this.mapLiteral()]);
      else args.push(this.chain());
      if (!this.isP(")")) this.expectP(",");
    }
    this.expectP(")");
    return args;
  }

  private mapLiteral(): Elem {
    this.expectP("[");
    const entries: [string, Primitive][] = [];
    while (!this.isP("]")) {
      const name = this.peek();
      this.i += 1;
      this.expectP(":");
      const value = this.peek();
      this.i += 1;
      entries.push([name.v, value.t === "num" ? Number(value.v) : value.v]);
      if (!this.isP("]")) this.expectP(",");
    }
    this.expectP("]");
    return { t: "map", entries };
  }

  /** Returns the closure body as tokens, evaluated later per element. */
  private closure(): Tok[] {
    this.expectP("{");
    const body: Tok[] = [];
    let depth = 1;
    while (depth > 0) {
      const token = this.peek();
      if (token.t === "eof") throw new GremlinError("Unterminated closure {…}");
      if (token.t === "p" && token.v === "{") depth += 1;
      if (token.t === "p" && token.v === "}") depth -= 1;
      if (depth > 0) body.push(token);
      this.i += 1;
    }
    body.push({ t: "eof", v: "" });
    return body;
  }

  private vertex(elem: Elem) {
    if (elem && typeof elem === "object" && elem.t === "v") return this.graph.vertices.get(elem.id);
    return undefined;
  }
  private edge(elem: Elem) {
    if (elem && typeof elem === "object" && elem.t === "e") return this.graph.edges.get(elem.id);
    return undefined;
  }

  private step(pipe: Elem[] | "g", name: string, args: Elem[][], closure: Tok[] | null): Elem[] {
    const labels = args.map((arg) => String(arg[0]));
    const edgesOf = (direction: "out" | "in" | "both") =>
      (pipe as Elem[]).flatMap((elem) => {
        const vertex = this.vertex(elem);
        if (!vertex) return [];
        return [...this.graph.edges.values()]
          .filter((edge) => (direction !== "in" && edge.out === vertex.id) || (direction !== "out" && edge.in === vertex.id))
          .filter((edge) => labels.length === 0 || labels.includes(edge.label))
          .map((edge): Elem => ({ t: "e", id: edge.id }));
      });

    if (pipe === "g") {
      switch (name) {
        case "V":
          return [...this.graph.vertices.keys()].map((id) => ({ t: "v", id }));
        case "E":
          return [...this.graph.edges.keys()].map((id) => ({ t: "e", id }));
        case "v":
        case "e": {
          const id = Number(args[0]?.[0]);
          const exists = name === "v" ? this.graph.vertices.has(id) : this.graph.edges.has(id);
          return exists ? [{ t: name, id }] : [null];
        }
        case "addVertex": {
          const map = args[0]?.[0];
          const props = map && typeof map === "object" && map.t === "map" ? Object.fromEntries(map.entries) : {};
          return [{ t: "v", id: this.graph.addVertex(props).id }];
        }
        case "addEdge": {
          const from = this.vertex(args[0]?.[0] ?? null);
          const to = this.vertex(args[1]?.[0] ?? null);
          if (!from || !to) throw new GremlinError("addEdge needs two vertices and a label");
          return [{ t: "e", id: this.graph.addEdge(from.id, to.id, String(args[2]?.[0])).id }];
        }
        default:
          throw new GremlinError(`No such property or step: g.${name}`);
      }
    }

    switch (name) {
      case "outE":
        return edgesOf("out");
      case "inE":
        return edgesOf("in");
      case "bothE":
        return edgesOf("both");
      case "out":
        return edgesOf("out").map((elem) => ({ t: "v", id: this.edge(elem)!.in }));
      case "in":
        return edgesOf("in").map((elem) => ({ t: "v", id: this.edge(elem)!.out }));
      case "both":
        return edgesOf("both").flatMap((elem) => {
          const edge = this.edge(elem)!;
          return (pipe as Elem[]).some((v) => this.vertex(v)?.id === edge.out) ? [{ t: "v", id: edge.in }] : [{ t: "v", id: edge.out }];
        });
      case "inV":
        return pipe.flatMap((elem) => (this.edge(elem) ? [{ t: "v", id: this.edge(elem)!.in } as Elem] : []));
      case "outV":
        return pipe.flatMap((elem) => (this.edge(elem) ? [{ t: "v", id: this.edge(elem)!.out } as Elem] : []));
      case "bothV":
        return pipe.flatMap((elem) => {
          const edge = this.edge(elem);
          return edge ? ([{ t: "v", id: edge.out }, { t: "v", id: edge.in }] as Elem[]) : [];
        });
      case "filter":
        if (!closure) throw new GremlinError("filter needs a closure, e.g. filter{it.name == 'x'}");
        return pipe.filter((elem) => this.truthy(closure, elem));
      case "has":
        return pipe.filter((elem) => this.prop(elem, labels[0]) === (args[1]?.[0] ?? null));
      case "map":
        return pipe.map((elem) => {
          const target = this.vertex(elem) ?? this.edge(elem);
          return { t: "map", entries: Object.entries(target?.props ?? {}) } as Elem;
        });
      case "next":
        if (pipe.length === 0) throw new GremlinError("NoSuchElementException: the pipeline is empty");
        return [pipe[0]];
      case "count":
        return [pipe.length];
      case "dedup": {
        const seen = new Set<string>();
        return pipe.filter((elem) => {
          const itemKey = JSON.stringify(elem);
          return seen.has(itemKey) ? false : (seen.add(itemKey), true);
        });
      }
      case "toList":
      case "iterate":
        return pipe;
      case "class":
        return ["class com.tinkerpop.gremlin.pipes.GremlinPipeline"];
      case "id":
        return pipe.map((elem) => (elem && typeof elem === "object" && "id" in elem ? elem.id : null));
      case "label":
        return pipe.map((elem) => this.edge(elem)?.label ?? null);
      default:
        if (args.length > 0) throw new GremlinError(`Unknown step ${name}()`);
        return pipe.map((elem) => this.prop(elem, name)).filter((value) => value !== null);
    }
  }

  private prop(elem: Elem, name: string): Primitive {
    const target = this.vertex(elem) ?? this.edge(elem);
    return target?.props[name] ?? null;
  }

  /* closure evaluation: it.prop, it.equals(x), literals, ==, !=, <, >, !, &&, || */
  private truthy(body: Tok[], it: Elem): boolean {
    let index = 0;
    const peek = () => body[index];
    const isP = (value: string) => peek().t === "p" && peek().v === value;
    const self = this;
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

    function or(): unknown {
      let value = and();
      while (isP("||")) {
        index += 1;
        const right = and();
        value = Boolean(value) || Boolean(right);
      }
      return value;
    }
    function and(): unknown {
      let value = unary();
      while (isP("&&")) {
        index += 1;
        const right = unary();
        value = Boolean(value) && Boolean(right);
      }
      return value;
    }
    function unary(): unknown {
      if (isP("!")) {
        index += 1;
        return !unary();
      }
      return comparison();
    }
    function comparison(): unknown {
      const left = term();
      if (peek().t === "p" && ["==", "!=", "<", ">", "<=", ">="].includes(peek().v)) {
        const op = peek().v;
        index += 1;
        const right = term();
        if (op === "==") return same(left, right);
        if (op === "!=") return !same(left, right);
        const [a, b] = [left as number, right as number];
        return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
      }
      return left;
    }
    function term(): unknown {
      const token = peek();
      index += 1;
      if (token.t === "str") return token.v;
      if (token.t === "num") return Number(token.v);
      if (token.t === "p" && token.v === "(") {
        const value = or();
        index += 1;
        return value;
      }
      if (token.t !== "id") throw new GremlinError("Unsupported closure expression");
      if (token.v === "true" || token.v === "false") return token.v === "true";
      let value: unknown = token.v === "it" ? it : self.env.get(token.v)?.[0];
      if (value === undefined) throw new GremlinError(`No such property: ${token.v}`);
      while (isP(".")) {
        index += 1;
        const name = peek().v;
        index += 1;
        if (name === "equals" && isP("(")) {
          index += 1;
          const other = term();
          index += 1;
          value = same(value, other);
        } else value = self.prop(value as Elem, name);
      }
      return value;
    }
    return Boolean(or());
  }

  format(elem: Elem): string[] {
    if (elem === null) return ["null"];
    if (typeof elem !== "object") return [String(elem)];
    if (elem.t === "v") return [`v[${elem.id}]`];
    if (elem.t === "e") {
      const edge = this.graph.edges.get(elem.id)!;
      return [`e[${edge.id}][${edge.out}-${edge.label}->${edge.in}]`];
    }
    return elem.entries.map(([name, value]) => `${name}=${value}`);
  }
}

/** Splits console input into statements: one per line or per ';', comments and prompts removed. */
function statements(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/^\s*gremlin>\s?/, "").replace(/\/\/.*$/, "").trim())
    .flatMap((line) => line.split(";"))
    .map((line) => line.trim())
    .filter(Boolean);
}

export function runGremlin(source: string): RunResult {
  const started = performance.now();
  const interpreter = new Interpreter(wineGraph(), new Map());
  const lines: string[] = [];
  for (const statement of statements(source)) {
    lines.push(`gremlin> ${statement}`);
    try {
      const result = interpreter.statement(statement);
      for (const elem of result) lines.push(...interpreter.format(elem).map((text) => `==>${text}`));
    } catch (error) {
      return {
        outputs: [{ kind: "lines", lines }],
        error: { message: error instanceof Error ? error.message : String(error), statement },
        ms: performance.now() - started,
      };
    }
  }
  return { outputs: [{ kind: "lines", lines }], ms: performance.now() - started };
}
