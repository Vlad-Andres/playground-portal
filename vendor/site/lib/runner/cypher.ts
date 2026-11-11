/**
 * A small Cypher interpreter for learning: the subset of the language used in the course
 * (MATCH, OPTIONAL MATCH, WHERE, RETURN, WITH, ORDER BY, SKIP, LIMIT, DISTINCT, aggregation,
 * CREATE, MERGE, SET, DELETE, DETACH DELETE, UNWIND, variable-length paths, path variables and
 * shortestPath) over an in-memory property graph. It is not Neo4j: no indexes, no planner.
 */
import type { RunOutput, RunResult } from "@site/lib/runner/types";

/* ───────────────────────────── Graph ───────────────────────────── */

export type Props = Record<string, Val>;

interface GNode {
  id: number;
  labels: string[];
  props: Props;
}

interface GRel {
  id: number;
  type: string;
  start: number;
  end: number;
  props: Props;
}

export class Graph {
  nodes = new Map<number, GNode>();
  rels = new Map<number, GRel>();
  outgoing = new Map<number, Set<number>>();
  incoming = new Map<number, Set<number>>();
  nextNode = 0;
  nextRel = 0;

  addNode(labels: string[], props: Props) {
    const node = { id: this.nextNode++, labels, props };
    this.nodes.set(node.id, node);
    this.outgoing.set(node.id, new Set());
    this.incoming.set(node.id, new Set());
    return node;
  }

  addRel(type: string, start: number, end: number, props: Props) {
    const rel = { id: this.nextRel++, type, start, end, props };
    this.rels.set(rel.id, rel);
    this.outgoing.get(start)?.add(rel.id);
    this.incoming.get(end)?.add(rel.id);
    return rel;
  }

  deleteRel(id: number) {
    const rel = this.rels.get(id);
    if (!rel) return false;
    this.outgoing.get(rel.start)?.delete(id);
    this.incoming.get(rel.end)?.delete(id);
    this.rels.delete(id);
    return true;
  }

  degree(id: number) {
    return (this.outgoing.get(id)?.size ?? 0) + (this.incoming.get(id)?.size ?? 0);
  }

  clone() {
    const copy = new Graph();
    for (const node of this.nodes.values()) {
      copy.nodes.set(node.id, { id: node.id, labels: [...node.labels], props: structuredClone(node.props) });
      copy.outgoing.set(node.id, new Set(this.outgoing.get(node.id)));
      copy.incoming.set(node.id, new Set(this.incoming.get(node.id)));
    }
    for (const rel of this.rels.values()) copy.rels.set(rel.id, { ...rel, props: structuredClone(rel.props) });
    copy.nextNode = this.nextNode;
    copy.nextRel = this.nextRel;
    return copy;
  }
}

/* ───────────────────────────── Values ───────────────────────────── */

export class NodeRef {
  constructor(readonly id: number) {}
}
export class RelRef {
  constructor(readonly id: number) {}
}
export class PathVal {
  constructor(
    readonly nodes: number[],
    readonly rels: number[],
  ) {}
}

export type Val = null | boolean | number | string | Val[] | NodeRef | RelRef | PathVal | { [key: string]: Val };

type Row = Record<string, Val>;

export class CypherError extends Error {}

/* ───────────────────────────── Lexer ───────────────────────────── */

interface Tok {
  t: "id" | "num" | "str" | "p" | "eof";
  v: string;
  start: number;
  end: number;
  quoted?: boolean;
}

const MULTI = ["<>", "<=", ">=", "..", "!="];
const SINGLE = "()[]{},:.|*-<>=+/%;!^";

function lex(source: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (source.startsWith("/*", i)) {
      const close = source.indexOf("*/", i + 2);
      i = close < 0 ? source.length : close + 2;
      continue;
    }
    const start = i;
    if (/[A-Za-z_]/.test(c)) {
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      tokens.push({ t: "id", v: source.slice(start, i), start, end: i });
      continue;
    }
    if (c === "`") {
      const close = source.indexOf("`", i + 1);
      if (close < 0) throw new CypherError("Unterminated `quoted` name");
      tokens.push({ t: "id", v: source.slice(i + 1, close), start, end: close + 1, quoted: true });
      i = close + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      if (source[i] === "." && /[0-9]/.test(source[i + 1] ?? "")) {
        i += 1;
        while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      }
      if (/[eE]/.test(source[i] ?? "") && /[0-9+-]/.test(source[i + 1] ?? "")) {
        i += 2;
        while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      }
      tokens.push({ t: "num", v: source.slice(start, i), start, end: i });
      continue;
    }
    if (c === "'" || c === '"') {
      let value = "";
      i += 1;
      while (i < source.length && source[i] !== c) {
        if (source[i] === "\\" && i + 1 < source.length) {
          const next = source[i + 1];
          value += next === "n" ? "\n" : next === "t" ? "\t" : next;
          i += 2;
        } else {
          value += source[i];
          i += 1;
        }
      }
      if (i >= source.length) throw new CypherError("Unterminated string literal");
      i += 1;
      tokens.push({ t: "str", v: value, start, end: i });
      continue;
    }
    const multi = MULTI.find((op) => source.startsWith(op, i));
    if (multi) {
      tokens.push({ t: "p", v: multi, start, end: i + multi.length });
      i += multi.length;
      continue;
    }
    if (SINGLE.includes(c)) {
      tokens.push({ t: "p", v: c, start, end: i + 1 });
      i += 1;
      continue;
    }
    throw new CypherError(`Unexpected character '${c}'`);
  }
  tokens.push({ t: "eof", v: "", start: source.length, end: source.length });
  return tokens;
}

/* ───────────────────────────── AST ───────────────────────────── */

type MapExpr = [string, Expr][];

interface NodePat {
  v?: string;
  labels: string[];
  props?: MapExpr;
}

interface RelPat {
  v?: string;
  types: string[];
  dir: "out" | "in" | "both";
  range?: { min: number; max: number };
  props?: MapExpr;
}

interface PathPat {
  v?: string;
  shortest?: boolean;
  nodes: NodePat[];
  rels: RelPat[];
}

type Expr =
  | { k: "lit"; v: Val }
  | { k: "var"; name: string }
  | { k: "prop"; obj: Expr; key: string }
  | { k: "idx"; obj: Expr; index: Expr }
  | { k: "list"; items: Expr[] }
  | { k: "map"; entries: MapExpr }
  | { k: "bin"; op: string; l: Expr; r: Expr }
  | { k: "not"; e: Expr }
  | { k: "neg"; e: Expr }
  | { k: "isnull"; e: Expr; not: boolean }
  | { k: "call"; name: string; args: Expr[]; distinct: boolean; star: boolean }
  | { k: "pattern"; path: PathPat };

interface Item {
  expr: Expr;
  alias?: string;
  text: string;
}

interface Order {
  expr: Expr;
  text: string;
  desc: boolean;
}

interface Projection {
  distinct: boolean;
  star: boolean;
  items: Item[];
  order: Order[];
  skip?: Expr;
  limit?: Expr;
  where?: Expr;
}

type Clause =
  | { k: "match"; optional: boolean; patterns: PathPat[]; where?: Expr }
  | { k: "create"; patterns: PathPat[] }
  | { k: "merge"; pattern: PathPat }
  | { k: "set"; items: ({ target: Expr; value: Expr } | { variable: string; labels: string[] })[] }
  | { k: "remove"; items: { target: Expr }[] }
  | { k: "delete"; detach: boolean; exprs: Expr[] }
  | { k: "unwind"; expr: Expr; as: string }
  | ({ k: "with" } & Projection)
  | ({ k: "return" } & Projection);

interface Statement {
  clauses: Clause[];
  text: string;
}

const AGGREGATES = new Set(["count", "collect", "sum", "avg", "min", "max"]);
const CLAUSE_START = new Set(["MATCH", "OPTIONAL", "CREATE", "MERGE", "SET", "DELETE", "DETACH", "WITH", "RETURN", "UNWIND", "REMOVE"]);

/* ───────────────────────────── Parser ───────────────────────────── */

class Parser {
  private i = 0;
  constructor(
    private readonly tokens: Tok[],
    private readonly source: string,
  ) {}

  private peek(offset = 0) {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)];
  }
  private next() {
    const token = this.peek();
    this.i = Math.min(this.i + 1, this.tokens.length - 1);
    return token;
  }
  private isP(value: string, offset = 0) {
    const token = this.peek(offset);
    return token.t === "p" && token.v === value;
  }
  private eatP(value: string) {
    if (this.isP(value)) {
      this.next();
      return true;
    }
    return false;
  }
  private expectP(value: string) {
    if (!this.eatP(value)) this.fail(`Expected '${value}'`);
  }
  private isKw(word: string, offset = 0) {
    const token = this.peek(offset);
    return token.t === "id" && !token.quoted && token.v.toUpperCase() === word;
  }
  private eatKw(word: string) {
    if (this.isKw(word)) {
      this.next();
      return true;
    }
    return false;
  }
  private expectKw(word: string) {
    if (!this.eatKw(word)) this.fail(`Expected ${word}`);
  }
  private name() {
    const token = this.next();
    if (token.t !== "id") this.fail("Expected a name", token);
    return token.v;
  }
  private fail(message: string, token = this.peek()): never {
    const shown = token.t === "eof" ? "end of input" : `'${this.source.slice(token.start, token.end)}'`;
    throw new CypherError(`${message}, found ${shown}`);
  }

  script(): Statement[] {
    const statements: Statement[] = [];
    while (this.peek().t !== "eof") {
      if (this.eatP(";")) continue;
      const start = this.peek().start;
      const clauses: Clause[] = [];
      while (this.peek().t !== "eof" && !this.isP(";")) {
        const clause = this.clause();
        clauses.push(clause);
        // A RETURN ends a query: a new clause after it starts the next statement.
        if (clause.k === "return") break;
      }
      const end = this.tokens[Math.max(0, this.i - 1)].end;
      statements.push({ clauses, text: this.source.slice(start, end).trim() });
    }
    return statements;
  }

  private clause(): Clause {
    if (this.eatKw("OPTIONAL")) {
      this.expectKw("MATCH");
      return this.matchClause(true);
    }
    if (this.eatKw("MATCH")) return this.matchClause(false);
    if (this.eatKw("CREATE")) {
      this.eatKw("UNIQUE");
      return { k: "create", patterns: this.patternList() };
    }
    if (this.eatKw("MERGE")) return { k: "merge", pattern: this.path() };
    if (this.eatKw("SET")) return this.setClause();
    if (this.eatKw("REMOVE")) {
      const items: { target: Expr }[] = [];
      do items.push({ target: this.postfix() });
      while (this.eatP(","));
      return { k: "remove", items };
    }
    if (this.eatKw("DETACH")) {
      this.expectKw("DELETE");
      return { k: "delete", detach: true, exprs: this.exprList() };
    }
    if (this.eatKw("DELETE")) return { k: "delete", detach: false, exprs: this.exprList() };
    if (this.eatKw("UNWIND")) {
      const expr = this.expr();
      this.expectKw("AS");
      return { k: "unwind", expr, as: this.name() };
    }
    if (this.eatKw("WITH")) return { k: "with", ...this.projection(true) };
    if (this.eatKw("RETURN")) return { k: "return", ...this.projection(false) };
    if (this.isKw("START")) this.fail("START is deprecated: anchor the pattern in MATCH instead");
    this.fail("Expected a clause (MATCH, CREATE, MERGE, SET, DELETE, WITH, RETURN…)");
  }

  private matchClause(optional: boolean): Clause {
    const patterns = this.patternList();
    const where = this.eatKw("WHERE") ? this.expr() : undefined;
    return { k: "match", optional, patterns, where };
  }

  private setClause(): Clause {
    const items: ({ target: Expr; value: Expr } | { variable: string; labels: string[] })[] = [];
    do {
      if (this.peek().t === "id" && this.isP(":", 1)) {
        const variable = this.name();
        const labels: string[] = [];
        while (this.eatP(":")) labels.push(this.name());
        items.push({ variable, labels });
        continue;
      }
      const target = this.postfix();
      this.expectP("=");
      items.push({ target, value: this.expr() });
    } while (this.eatP(","));
    return { k: "set", items };
  }

  private exprList() {
    const exprs: Expr[] = [];
    do exprs.push(this.expr());
    while (this.eatP(","));
    return exprs;
  }

  private projection(isWith: boolean): Projection {
    const distinct = this.eatKw("DISTINCT");
    let star = false;
    const items: Item[] = [];
    if (this.eatP("*")) {
      star = true;
      if (!this.eatP(",")) return this.projectionTail({ distinct, star, items, order: [] }, isWith);
    }
    do {
      const start = this.peek().start;
      const expr = this.expr();
      const text = this.source.slice(start, this.tokens[this.i - 1].end).trim();
      const alias = this.eatKw("AS") ? this.name() : undefined;
      items.push({ expr, alias, text });
    } while (this.eatP(","));
    return this.projectionTail({ distinct, star, items, order: [] }, isWith);
  }

  private projectionTail(projection: Projection, isWith: boolean): Projection {
    if (this.isKw("ORDER")) {
      this.next();
      this.expectKw("BY");
      do {
        const start = this.peek().start;
        const expr = this.expr();
        const text = this.source.slice(start, this.tokens[this.i - 1].end).trim();
        let desc = false;
        if (this.eatKw("DESC") || this.eatKw("DESCENDING")) desc = true;
        else if (!this.eatKw("ASC")) this.eatKw("ASCENDING");
        projection.order.push({ expr, text, desc });
      } while (this.eatP(","));
    }
    if (this.eatKw("SKIP")) projection.skip = this.expr();
    if (this.eatKw("LIMIT")) projection.limit = this.expr();
    if (isWith && this.eatKw("WHERE")) projection.where = this.expr();
    return projection;
  }

  private patternList() {
    const patterns: PathPat[] = [];
    do patterns.push(this.path());
    while (this.eatP(","));
    return patterns;
  }

  path(): PathPat {
    let v: string | undefined;
    if (this.peek().t === "id" && this.isP("=", 1)) {
      v = this.name();
      this.next();
    }
    if (this.isKw("SHORTESTPATH") || this.isKw("ALLSHORTESTPATHS")) {
      this.next();
      this.expectP("(");
      const inner = this.chain();
      this.expectP(")");
      return { ...inner, v, shortest: true };
    }
    return { ...this.chain(), v };
  }

  private chain(): PathPat {
    const nodes = [this.node()];
    const rels: RelPat[] = [];
    while (this.isP("-") || (this.isP("<") && this.isP("-", 1))) {
      rels.push(this.rel());
      nodes.push(this.node());
    }
    return { nodes, rels };
  }

  private node(): NodePat {
    this.expectP("(");
    const pattern: NodePat = { labels: [] };
    if (this.peek().t === "id") pattern.v = this.name();
    while (this.eatP(":")) pattern.labels.push(this.name());
    if (this.isP("{")) pattern.props = this.mapLiteral();
    this.expectP(")");
    return pattern;
  }

  private rel(): RelPat {
    const left = this.eatP("<");
    this.expectP("-");
    const pattern: RelPat = { types: [], dir: "both" };
    if (this.eatP("[")) {
      if (this.peek().t === "id") pattern.v = this.name();
      if (this.eatP(":")) {
        pattern.types.push(this.name());
        while (this.eatP("|")) {
          this.eatP(":");
          pattern.types.push(this.name());
        }
      }
      if (this.eatP("*")) {
        let min = 1;
        let max = Infinity;
        if (this.peek().t === "num") {
          min = Number(this.next().v);
          max = min;
        }
        if (this.eatP("..")) max = this.peek().t === "num" ? Number(this.next().v) : Infinity;
        pattern.range = { min, max };
      }
      if (this.isP("{")) pattern.props = this.mapLiteral();
      this.expectP("]");
    }
    this.expectP("-");
    const right = this.eatP(">");
    if (left && right) this.fail("A relationship cannot point both ways");
    pattern.dir = left ? "in" : right ? "out" : "both";
    return pattern;
  }

  private mapLiteral(): MapExpr {
    this.expectP("{");
    const entries: MapExpr = [];
    if (!this.isP("}")) {
      do {
        const key = this.peek().t === "str" ? this.next().v : this.name();
        this.expectP(":");
        entries.push([key, this.expr()]);
      } while (this.eatP(","));
    }
    this.expectP("}");
    return entries;
  }

  /* expressions, lowest precedence first */
  expr(): Expr {
    return this.or();
  }
  private or(): Expr {
    let left = this.xor();
    while (this.eatKw("OR")) left = { k: "bin", op: "OR", l: left, r: this.xor() };
    return left;
  }
  private xor(): Expr {
    let left = this.and();
    while (this.eatKw("XOR")) left = { k: "bin", op: "XOR", l: left, r: this.and() };
    return left;
  }
  private and(): Expr {
    let left = this.not();
    while (this.eatKw("AND")) left = { k: "bin", op: "AND", l: left, r: this.not() };
    return left;
  }
  private not(): Expr {
    if (this.eatKw("NOT")) return { k: "not", e: this.not() };
    return this.comparison();
  }
  private comparison(): Expr {
    let left = this.additive();
    for (;;) {
      const token = this.peek();
      if (token.t === "p" && ["=", "<>", "!=", "<", ">", "<=", ">="].includes(token.v)) {
        // "<-" starts a pattern, not a comparison
        if (token.v === "<" && this.isP("-", 1)) break;
        this.next();
        left = { k: "bin", op: token.v === "!=" ? "<>" : token.v, l: left, r: this.additive() };
      } else if (this.isKw("IS")) {
        this.next();
        const not = this.eatKw("NOT");
        this.expectKw("NULL");
        left = { k: "isnull", e: left, not };
      } else if (this.isKw("IN")) {
        this.next();
        left = { k: "bin", op: "IN", l: left, r: this.additive() };
      } else if (this.isKw("CONTAINS")) {
        this.next();
        left = { k: "bin", op: "CONTAINS", l: left, r: this.additive() };
      } else if ((this.isKw("STARTS") || this.isKw("ENDS")) && this.isKw("WITH", 1)) {
        const op = this.next().v.toUpperCase();
        this.next();
        left = { k: "bin", op, l: left, r: this.additive() };
      } else break;
    }
    return left;
  }
  private additive(): Expr {
    let left = this.multiplicative();
    // "-[" , "--" and "->" continue a pattern, so they are not a minus sign
    while (this.isP("+") || (this.isP("-") && !this.isP("[", 1) && !this.isP("-", 1) && !this.isP(">", 1))) {
      const op = this.next().v;
      left = { k: "bin", op, l: left, r: this.multiplicative() };
    }
    return left;
  }
  private multiplicative(): Expr {
    let left = this.unary();
    while (this.isP("*") || this.isP("/") || this.isP("%") || this.isP("^")) {
      const op = this.next().v;
      left = { k: "bin", op, l: left, r: this.unary() };
    }
    return left;
  }
  private unary(): Expr {
    if (this.eatP("-")) return { k: "neg", e: this.unary() };
    if (this.eatP("+")) return this.unary();
    return this.postfix();
  }
  postfix(): Expr {
    let expr = this.primary();
    for (;;) {
      if (this.isP(".") && this.peek(1).t === "id") {
        this.next();
        expr = { k: "prop", obj: expr, key: this.name() };
      } else if (this.isP("[")) {
        this.next();
        const index = this.expr();
        this.expectP("]");
        expr = { k: "idx", obj: expr, index };
      } else break;
    }
    return expr;
  }
  private primary(): Expr {
    const token = this.peek();
    if (token.t === "num") {
      this.next();
      return { k: "lit", v: Number(token.v) };
    }
    if (token.t === "str") {
      this.next();
      return { k: "lit", v: token.v };
    }
    if (token.t === "p" && token.v === "(") {
      const saved = this.i;
      try {
        const path = this.path();
        if (path.rels.length > 0) return { k: "pattern", path };
      } catch {
        // not a pattern: fall back to a parenthesised expression
      }
      this.i = saved;
      this.next();
      const inner = this.expr();
      this.expectP(")");
      return inner;
    }
    if (token.t === "p" && token.v === "[") {
      this.next();
      const items: Expr[] = [];
      if (!this.isP("]")) {
        do items.push(this.expr());
        while (this.eatP(","));
      }
      this.expectP("]");
      return { k: "list", items };
    }
    if (token.t === "p" && token.v === "{") return { k: "map", entries: this.mapLiteral() };
    if (token.t === "id") {
      const upper = token.v.toUpperCase();
      const literal: Record<string, Val> = { TRUE: true, FALSE: false, NULL: null };
      if (!token.quoted && upper in literal) {
        this.next();
        return { k: "lit", v: literal[upper] };
      }
      if (this.isP("(", 1)) {
        this.next();
        this.next();
        const name = token.v.toLowerCase();
        if (this.eatP("*")) {
          this.expectP(")");
          return { k: "call", name, args: [], distinct: false, star: true };
        }
        const distinct = this.eatKw("DISTINCT");
        const args: Expr[] = [];
        if (!this.isP(")")) {
          do args.push(this.expr());
          while (this.eatP(","));
        }
        this.expectP(")");
        return { k: "call", name, args, distinct, star: false };
      }
      this.next();
      return { k: "var", name: token.v };
    }
    this.fail("Expected an expression");
  }
}

/* ───────────────────────────── Evaluation ───────────────────────────── */

function isAggregate(expr: Expr): boolean {
  switch (expr.k) {
    case "call":
      return AGGREGATES.has(expr.name) || expr.args.some(isAggregate);
    case "bin":
      return isAggregate(expr.l) || isAggregate(expr.r);
    case "not":
    case "neg":
    case "isnull":
      return isAggregate(expr.e);
    case "prop":
      return isAggregate(expr.obj);
    case "idx":
      return isAggregate(expr.obj) || isAggregate(expr.index);
    case "list":
      return expr.items.some(isAggregate);
    case "map":
      return expr.entries.some(([, value]) => isAggregate(value));
    default:
      return false;
  }
}

function key(value: Val): string {
  if (value instanceof NodeRef) return `n${value.id}`;
  if (value instanceof RelRef) return `r${value.id}`;
  if (value instanceof PathVal) return `p${value.nodes.join(",")}|${value.rels.join(",")}`;
  if (Array.isArray(value)) return `[${value.map(key).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).map(([k, v]) => `${k}:${key(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

function equals(a: Val, b: Val): boolean | null {
  if (a === null || b === null) return null;
  return key(a) === key(b);
}

function compare(a: Val, b: Val): number | null {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return null;
}

/** Sort order for ORDER BY: nulls last, then by type. */
function orderCompare(a: Val, b: Val) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b) ?? key(a).localeCompare(key(b));
}

function truthy(value: Val) {
  return value === true;
}

interface Stats {
  nodesCreated: number;
  relsCreated: number;
  propsSet: number;
  labelsAdded: number;
  nodesDeleted: number;
  relsDeleted: number;
}

class Executor {
  stats: Stats = { nodesCreated: 0, relsCreated: 0, propsSet: 0, labelsAdded: 0, nodesDeleted: 0, relsDeleted: 0 };
  constructor(readonly g: Graph) {}

  /* expression evaluation; `group` is set while computing aggregates */
  eval(expr: Expr, row: Row, group?: Row[]): Val {
    switch (expr.k) {
      case "lit":
        return expr.v;
      case "var":
        if (!(expr.name in row)) throw new CypherError(`Variable \`${expr.name}\` not defined`);
        return row[expr.name];
      case "prop": {
        const obj = this.eval(expr.obj, row, group);
        if (obj === null) return null;
        if (obj instanceof NodeRef) return this.g.nodes.get(obj.id)?.props[expr.key] ?? null;
        if (obj instanceof RelRef) return this.g.rels.get(obj.id)?.props[expr.key] ?? null;
        if (typeof obj === "object" && !Array.isArray(obj) && !(obj instanceof PathVal)) return obj[expr.key] ?? null;
        throw new CypherError(`Cannot read property ${expr.key} of a ${Array.isArray(obj) ? "list" : typeof obj}`);
      }
      case "idx": {
        const obj = this.eval(expr.obj, row, group);
        const index = this.eval(expr.index, row, group);
        if (Array.isArray(obj) && typeof index === "number") return obj[index < 0 ? obj.length + index : index] ?? null;
        if (obj && typeof obj === "object" && typeof index === "string" && !Array.isArray(obj)) return (obj as Record<string, Val>)[index] ?? null;
        return null;
      }
      case "list":
        return expr.items.map((item) => this.eval(item, row, group));
      case "map":
        return Object.fromEntries(expr.entries.map(([name, value]) => [name, this.eval(value, row, group)]));
      case "not": {
        const value = this.eval(expr.e, row, group);
        return value === null ? null : !truthy(value);
      }
      case "neg": {
        const value = this.eval(expr.e, row, group);
        return typeof value === "number" ? -value : null;
      }
      case "isnull": {
        const isNull = this.eval(expr.e, row, group) === null;
        return expr.not ? !isNull : isNull;
      }
      case "pattern":
        return this.matchPath(expr.path, row, new Set()).next().done === false;
      case "bin":
        return this.binary(expr.op, expr.l, expr.r, row, group);
      case "call":
        return this.call(expr, row, group);
    }
  }

  private binary(op: string, l: Expr, r: Expr, row: Row, group?: Row[]): Val {
    if (op === "AND" || op === "OR" || op === "XOR") {
      const a = this.eval(l, row, group);
      const b = this.eval(r, row, group);
      if (op === "AND") return a === false || b === false ? false : a === null || b === null ? null : true;
      if (op === "OR") return a === true || b === true ? true : a === null || b === null ? null : false;
      return a === null || b === null ? null : truthy(a) !== truthy(b);
    }
    const a = this.eval(l, row, group);
    const b = this.eval(r, row, group);
    switch (op) {
      case "=":
        return equals(a, b);
      case "<>": {
        const same = equals(a, b);
        return same === null ? null : !same;
      }
      case "<":
      case ">":
      case "<=":
      case ">=": {
        const c = compare(a, b);
        if (c === null) return null;
        return op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0;
      }
      case "IN":
        if (!Array.isArray(b)) return null;
        return b.some((item) => equals(a, item) === true);
      case "CONTAINS":
        return typeof a === "string" && typeof b === "string" ? a.includes(b) : null;
      case "STARTS":
        return typeof a === "string" && typeof b === "string" ? a.startsWith(b) : null;
      case "ENDS":
        return typeof a === "string" && typeof b === "string" ? a.endsWith(b) : null;
      case "+":
        if (Array.isArray(a)) return [...a, ...(Array.isArray(b) ? b : [b])];
        if (typeof a === "string" || typeof b === "string") return a === null || b === null ? null : `${display(a)}${display(b)}`;
        return typeof a === "number" && typeof b === "number" ? a + b : null;
      default: {
        if (typeof a !== "number" || typeof b !== "number") return null;
        if (op === "-") return a - b;
        if (op === "*") return a * b;
        if (op === "^") return a ** b;
        if (op === "%") return a % b;
        if (b === 0 && Number.isInteger(a)) throw new CypherError("/ by zero");
        return Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b;
      }
    }
  }

  private call(expr: Extract<Expr, { k: "call" }>, row: Row, group?: Row[]): Val {
    if (AGGREGATES.has(expr.name)) {
      if (!group) throw new CypherError(`${expr.name}() is only allowed in RETURN or WITH`);
      let values = expr.star ? group.map(() => true as Val) : group.map((member) => this.eval(expr.args[0], member)).filter((value) => value !== null);
      if (expr.distinct) {
        const seen = new Set<string>();
        values = values.filter((value) => (seen.has(key(value)) ? false : (seen.add(key(value)), true)));
      }
      const numbers = values.filter((value): value is number => typeof value === "number");
      switch (expr.name) {
        case "count":
          return values.length;
        case "collect":
          return values;
        case "sum":
          return numbers.reduce((sum, value) => sum + value, 0);
        case "avg":
          return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
        case "min":
          return values.length ? values.reduce((best, value) => (orderCompare(value, best) < 0 ? value : best)) : null;
        case "max":
          return values.length ? values.reduce((best, value) => (orderCompare(value, best) > 0 ? value : best)) : null;
      }
    }
    const args = expr.args.map((arg) => this.eval(arg, row, group));
    const [first] = args;
    switch (expr.name) {
      case "id":
        return first instanceof NodeRef || first instanceof RelRef ? first.id : null;
      case "labels":
        return first instanceof NodeRef ? [...(this.g.nodes.get(first.id)?.labels ?? [])] : null;
      case "type":
        return first instanceof RelRef ? (this.g.rels.get(first.id)?.type ?? null) : null;
      case "length":
        if (first instanceof PathVal) return first.rels.length;
        if (Array.isArray(first) || typeof first === "string") return first.length;
        return null;
      case "size":
        return Array.isArray(first) || typeof first === "string" ? first.length : null;
      case "nodes":
        return first instanceof PathVal ? first.nodes.map((id) => new NodeRef(id)) : null;
      case "relationships":
      case "rels":
        return first instanceof PathVal ? first.rels.map((id) => new RelRef(id)) : null;
      case "startnode":
        return first instanceof RelRef ? new NodeRef(this.g.rels.get(first.id)!.start) : null;
      case "endnode":
        return first instanceof RelRef ? new NodeRef(this.g.rels.get(first.id)!.end) : null;
      case "keys": {
        const props = first instanceof NodeRef ? this.g.nodes.get(first.id)?.props : first instanceof RelRef ? this.g.rels.get(first.id)?.props : null;
        return props ? Object.keys(props) : null;
      }
      case "properties": {
        const props = first instanceof NodeRef ? this.g.nodes.get(first.id)?.props : first instanceof RelRef ? this.g.rels.get(first.id)?.props : null;
        return props ? { ...props } : null;
      }
      case "toupper":
        return typeof first === "string" ? first.toUpperCase() : null;
      case "tolower":
        return typeof first === "string" ? first.toLowerCase() : null;
      case "tostring":
        return first === null ? null : display(first);
      case "tointeger":
        return first === null || Number.isNaN(Number(first)) ? null : Math.trunc(Number(first));
      case "tofloat":
        return first === null || Number.isNaN(Number(first)) ? null : Number(first);
      case "coalesce":
        return args.find((value) => value !== null) ?? null;
      case "abs":
        return typeof first === "number" ? Math.abs(first) : null;
      case "round":
        return typeof first === "number" ? Math.round(first) : null;
      case "exists":
        return first !== null && first !== false;
      case "head":
        return Array.isArray(first) ? (first[0] ?? null) : null;
      case "last":
        return Array.isArray(first) ? (first[first.length - 1] ?? null) : null;
      case "range": {
        const [from, to, step = 1] = args as number[];
        const out: number[] = [];
        for (let value = from; step > 0 ? value <= to : value >= to; value += step) out.push(value);
        return out;
      }
      default:
        throw new CypherError(`Unknown function '${expr.name}'`);
    }
  }

  /* pattern matching */
  private nodeMatches(id: number, pattern: NodePat, row: Row) {
    const node = this.g.nodes.get(id);
    if (!node) return false;
    if (pattern.v && pattern.v in row) {
      const bound = row[pattern.v];
      if (!(bound instanceof NodeRef) || bound.id !== id) return false;
    }
    if (!pattern.labels.every((label) => node.labels.includes(label))) return false;
    return (pattern.props ?? []).every(([name, value]) => equals(node.props[name] ?? null, this.eval(value, row)) === true);
  }

  private relMatches(id: number, pattern: RelPat, row: Row) {
    const rel = this.g.rels.get(id);
    if (!rel) return false;
    if (pattern.types.length > 0 && !pattern.types.includes(rel.type)) return false;
    return (pattern.props ?? []).every(([name, value]) => equals(rel.props[name] ?? null, this.eval(value, row)) === true);
  }

  /** (relationship id, node at the other end) for every relationship leaving `from` in the pattern's direction. */
  private *steps(from: number, dir: RelPat["dir"]): Generator<[number, number]> {
    if (dir !== "in") for (const id of this.g.outgoing.get(from) ?? []) yield [id, this.g.rels.get(id)!.end];
    if (dir !== "out") for (const id of this.g.incoming.get(from) ?? []) yield [id, this.g.rels.get(id)!.start];
  }

  *matchPath(pattern: PathPat, row: Row, used: Set<number>): Generator<Row> {
    if (pattern.shortest) {
      const best = new Map<string, { row: Row; length: number }>();
      for (const candidate of this.matchPath({ ...pattern, shortest: false, v: pattern.v ?? "__path" }, row, used)) {
        const path = candidate[pattern.v ?? "__path"] as PathVal;
        const pairKey = `${path.nodes[0]}-${path.nodes[path.nodes.length - 1]}`;
        const current = best.get(pairKey);
        if (!current || path.rels.length < current.length) best.set(pairKey, { row: candidate, length: path.rels.length });
      }
      for (const { row: found } of best.values()) {
        if (!pattern.v) delete found.__path;
        yield found;
      }
      return;
    }

    const first = pattern.nodes[0];
    const starts =
      first.v && row[first.v] instanceof NodeRef
        ? [(row[first.v] as NodeRef).id]
        : [...this.g.nodes.values()].filter((node) => first.labels.every((label) => node.labels.includes(label))).map((node) => node.id);

    for (const start of starts) {
      if (!this.nodeMatches(start, first, row)) continue;
      const bound = first.v ? { ...row, [first.v]: new NodeRef(start) } : { ...row };
      yield* this.extend(pattern, 0, start, bound, used, [start], []);
    }
  }

  private *extend(pattern: PathPat, index: number, at: number, row: Row, used: Set<number>, nodes: number[], rels: number[]): Generator<Row> {
    if (index === pattern.rels.length) {
      yield pattern.v ? { ...row, [pattern.v]: new PathVal(nodes, rels) } : row;
      return;
    }
    const relPattern = pattern.rels[index];
    const nextPattern = pattern.nodes[index + 1];
    const bind = (target: Row, relValue: Val, to: number) => {
      const next = { ...target };
      if (relPattern.v) next[relPattern.v] = relValue;
      if (nextPattern.v) next[nextPattern.v] = new NodeRef(to);
      return next;
    };

    if (!relPattern.range) {
      for (const [relId, to] of this.steps(at, relPattern.dir)) {
        if (used.has(relId) || !this.relMatches(relId, relPattern, row)) continue;
        if (relPattern.v && relPattern.v in row) {
          const boundRel = row[relPattern.v];
          if (!(boundRel instanceof RelRef) || boundRel.id !== relId) continue;
        }
        if (!this.nodeMatches(to, nextPattern, row)) continue;
        used.add(relId);
        yield* this.extend(pattern, index + 1, to, bind(row, new RelRef(relId), to), used, [...nodes, to], [...rels, relId]);
        used.delete(relId);
      }
      return;
    }

    const { min, max } = relPattern.range;
    const limit = Math.min(max, 15);
    const self = this;
    function* walk(node: number, trail: number[], trailNodes: number[]): Generator<Row> {
      if (trail.length >= min && self.nodeMatches(node, nextPattern, row)) {
        yield* self.extend(pattern, index + 1, node, bind(row, trail.map((id) => new RelRef(id)), node), used, [...nodes, ...trailNodes], [...rels, ...trail]);
      }
      if (trail.length === limit) return;
      for (const [relId, to] of self.steps(node, relPattern.dir)) {
        if (used.has(relId) || !self.relMatches(relId, relPattern, row)) continue;
        used.add(relId);
        yield* walk(to, [...trail, relId], [...trailNodes, to]);
        used.delete(relId);
      }
    }
    yield* walk(at, [], []);
  }

  *matchAll(patterns: PathPat[], index: number, row: Row, used: Set<number>): Generator<Row> {
    if (index === patterns.length) {
      yield row;
      return;
    }
    for (const next of this.matchPath(patterns[index], row, used)) yield* this.matchAll(patterns, index + 1, next, used);
  }

  /* clauses */
  run(statement: Statement): RunOutput {
    let rows: Row[] = [{}];
    for (const clause of statement.clauses) {
      switch (clause.k) {
        case "match": {
          const next: Row[] = [];
          for (const row of rows) {
            let found = false;
            for (const match of this.matchAll(clause.patterns, 0, row, new Set())) {
              if (clause.where && !truthy(this.eval(clause.where, match))) continue;
              found = true;
              next.push(match);
              if (next.length > 50_000) throw new CypherError("The query produced more than 50,000 rows — add a LIMIT or narrow the pattern");
            }
            if (!found && clause.optional) {
              const empty = { ...row };
              for (const pattern of clause.patterns) {
                for (const name of [pattern.v, ...pattern.nodes.map((n) => n.v), ...pattern.rels.map((r) => r.v)]) {
                  if (name && !(name in empty)) empty[name] = null;
                }
              }
              next.push(empty);
            }
          }
          rows = next;
          break;
        }
        case "create":
          rows = rows.map((row) => {
            let current = row;
            for (const pattern of clause.patterns) current = this.create(pattern, current);
            return current;
          });
          break;
        case "merge":
          rows = rows.flatMap((row) => {
            const found = [...this.matchPath(clause.pattern, row, new Set())];
            return found.length > 0 ? found : [this.create(clause.pattern, row)];
          });
          break;
        case "set":
          for (const row of rows) {
            for (const item of clause.items) {
              if ("variable" in item) {
                const target = row[item.variable];
                if (target instanceof NodeRef) {
                  const node = this.g.nodes.get(target.id);
                  for (const label of item.labels) {
                    if (node && !node.labels.includes(label)) {
                      node.labels.push(label);
                      this.stats.labelsAdded += 1;
                    }
                  }
                }
                continue;
              }
              if (item.target.k !== "prop") throw new CypherError("SET expects a property, e.g. SET n.name = 'x'");
              const owner = this.eval(item.target.obj, row);
              const props = owner instanceof NodeRef ? this.g.nodes.get(owner.id)?.props : owner instanceof RelRef ? this.g.rels.get(owner.id)?.props : null;
              if (!props) continue;
              const value = this.eval(item.value, row);
              if (value === null) delete props[item.target.key];
              else props[item.target.key] = value;
              this.stats.propsSet += 1;
            }
          }
          break;
        case "remove":
          for (const row of rows) {
            for (const { target } of clause.items) {
              if (target.k !== "prop") continue;
              const owner = this.eval(target.obj, row);
              const props = owner instanceof NodeRef ? this.g.nodes.get(owner.id)?.props : owner instanceof RelRef ? this.g.rels.get(owner.id)?.props : null;
              if (props && target.key in props) {
                delete props[target.key];
                this.stats.propsSet += 1;
              }
            }
          }
          break;
        case "delete":
          this.delete(clause.detach, clause.exprs, rows);
          break;
        case "unwind":
          rows = rows.flatMap((row) => {
            const value = this.eval(clause.expr, row);
            const list = Array.isArray(value) ? value : value === null ? [] : [value];
            return list.map((item) => ({ ...row, [clause.as]: item }));
          });
          break;
        case "with":
          rows = this.project(clause, rows).rows;
          if (clause.where) rows = rows.filter((row) => truthy(this.eval(clause.where!, row)));
          break;
        case "return": {
          const { rows: projected, columns } = this.project(clause, rows);
          return { kind: "table", columns, rows: projected.map((row) => columns.map((column) => display(row[column], this.g))) };
        }
      }
    }
    return { kind: "message", text: this.summary() };
  }

  private create(pattern: PathPat, row: Row): Row {
    const next = { ...row };
    const nodeIds = pattern.nodes.map((nodePattern) => {
      if (nodePattern.v && next[nodePattern.v] instanceof NodeRef) {
        if (nodePattern.labels.length > 0 || nodePattern.props) {
          throw new CypherError(`Can't create node \`${nodePattern.v}\` with labels or properties here. The variable is already declared in this context`);
        }
        return (next[nodePattern.v] as NodeRef).id;
      }
      const props = Object.fromEntries((nodePattern.props ?? []).map(([name, value]) => [name, this.eval(value, next)]).filter(([, value]) => value !== null));
      const node = this.g.addNode([...nodePattern.labels], props);
      this.stats.nodesCreated += 1;
      this.stats.labelsAdded += nodePattern.labels.length;
      this.stats.propsSet += Object.keys(props).length;
      if (nodePattern.v) next[nodePattern.v] = new NodeRef(node.id);
      return node.id;
    });
    const relIds = pattern.rels.map((relPattern, index) => {
      if (relPattern.types.length !== 1) throw new CypherError("A relationship created with CREATE must have exactly one type, e.g. -[:KNOWS]->");
      if (relPattern.dir === "both") throw new CypherError("Only directed relationships are supported in CREATE: add < or >");
      if (relPattern.range) throw new CypherError("Variable length relationships cannot be used in CREATE");
      const [from, to] = relPattern.dir === "out" ? [nodeIds[index], nodeIds[index + 1]] : [nodeIds[index + 1], nodeIds[index]];
      const props = Object.fromEntries((relPattern.props ?? []).map(([name, value]) => [name, this.eval(value, next)]).filter(([, value]) => value !== null));
      const rel = this.g.addRel(relPattern.types[0], from, to, props);
      this.stats.relsCreated += 1;
      this.stats.propsSet += Object.keys(props).length;
      if (relPattern.v) next[relPattern.v] = new RelRef(rel.id);
      return rel.id;
    });
    if (pattern.v) next[pattern.v] = new PathVal(nodeIds, relIds);
    return next;
  }

  private delete(detach: boolean, exprs: Expr[], rows: Row[]) {
    const nodes = new Set<number>();
    const rels = new Set<number>();
    const collect = (value: Val) => {
      if (value instanceof NodeRef) nodes.add(value.id);
      else if (value instanceof RelRef) rels.add(value.id);
      else if (value instanceof PathVal) {
        value.nodes.forEach((id) => nodes.add(id));
        value.rels.forEach((id) => rels.add(id));
      } else if (Array.isArray(value)) value.forEach(collect);
    };
    for (const row of rows) for (const expr of exprs) collect(this.eval(expr, row));

    for (const id of nodes) {
      const attached = [...(this.g.outgoing.get(id) ?? []), ...(this.g.incoming.get(id) ?? [])];
      if (detach) attached.forEach((relId) => rels.add(relId));
      else if (attached.some((relId) => !rels.has(relId))) {
        throw new CypherError(`Cannot delete node<${id}>, because it still has relationships. To delete this node, you must first delete its relationships (or use DETACH DELETE).`);
      }
    }
    for (const id of rels) if (this.g.deleteRel(id)) this.stats.relsDeleted += 1;
    for (const id of nodes) {
      if (this.g.nodes.delete(id)) {
        this.g.outgoing.delete(id);
        this.g.incoming.delete(id);
        this.stats.nodesDeleted += 1;
      }
    }
  }

  private project(projection: Projection, rows: Row[]) {
    let items = projection.items;
    if (projection.star) {
      const names = Object.keys(rows[0] ?? {}).filter((name) => !name.startsWith("__")).sort();
      items = [...names.map((name) => ({ expr: { k: "var", name } as Expr, text: name })), ...items];
    }
    const columns = items.map((item) => item.alias ?? item.text);
    const aggregated = items.some((item) => isAggregate(item.expr));

    let output: { env: Row; out: Row }[];
    if (!aggregated) {
      output = rows.map((row) => {
        const out: Row = {};
        items.forEach((item, index) => (out[columns[index]] = this.eval(item.expr, row)));
        return { env: { ...row, ...out }, out };
      });
    } else {
      const keys = items.filter((item) => !isAggregate(item.expr));
      const groups = new Map<string, Row[]>();
      for (const row of rows) {
        const groupKey = keys.map((item) => key(this.eval(item.expr, row))).join("|");
        const members = groups.get(groupKey);
        if (members) members.push(row);
        else groups.set(groupKey, [row]);
      }
      if (groups.size === 0 && keys.length === 0) groups.set("", []);
      output = [...groups.values()].map((members) => {
        const out: Row = {};
        items.forEach((item, index) => (out[columns[index]] = this.eval(item.expr, members[0] ?? {}, members)));
        return { env: out, out };
      });
    }

    if (projection.distinct) {
      const seen = new Set<string>();
      output = output.filter(({ out }) => {
        const rowKey = columns.map((column) => key(out[column])).join("|");
        return seen.has(rowKey) ? false : (seen.add(rowKey), true);
      });
    }

    if (projection.order.length > 0) {
      const valueOf = (entry: { env: Row; out: Row }, order: Order) => {
        const index = items.findIndex((item) => item.text === order.text || item.alias === order.text);
        return index >= 0 ? entry.out[columns[index]] : this.eval(order.expr, entry.env);
      };
      const keyed = output.map((entry) => ({ entry, values: projection.order.map((order) => valueOf(entry, order)) }));
      keyed.sort((a, b) => {
        for (let index = 0; index < projection.order.length; index += 1) {
          const result = orderCompare(a.values[index], b.values[index]);
          if (result !== 0) return projection.order[index].desc ? -result : result;
        }
        return 0;
      });
      output = keyed.map(({ entry }) => entry);
    }

    const skip = projection.skip ? Number(this.eval(projection.skip, {})) : 0;
    const limit = projection.limit ? Number(this.eval(projection.limit, {})) : Infinity;
    output = output.slice(skip, skip + limit);

    // WITH passes on only what it projects (named by alias, or by the variable itself)
    return { rows: output.map(({ out }) => out), columns };
  }

  summary() {
    const s = this.stats;
    const parts = [
      s.labelsAdded && `added ${s.labelsAdded} label${s.labelsAdded === 1 ? "" : "s"}`,
      s.nodesCreated && `created ${s.nodesCreated} node${s.nodesCreated === 1 ? "" : "s"}`,
      s.propsSet && `set ${s.propsSet} propert${s.propsSet === 1 ? "y" : "ies"}`,
      s.relsCreated && `created ${s.relsCreated} relationship${s.relsCreated === 1 ? "" : "s"}`,
      s.nodesDeleted && `deleted ${s.nodesDeleted} node${s.nodesDeleted === 1 ? "" : "s"}`,
      s.relsDeleted && `deleted ${s.relsDeleted} relationship${s.relsDeleted === 1 ? "" : "s"}`,
    ].filter(Boolean);
    return parts.length > 0 ? `${parts.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()) : "(no changes, no records)";
  }
}

/* ───────────────────────────── Display ───────────────────────────── */

const NAME_KEYS = ["name", "title", "username", "id", "date"];

function showProps(props: Props, graph: Graph) {
  const entries = Object.entries(props);
  return entries.length ? ` {${entries.map(([name, value]) => `${name}: ${display(value, graph)}`).join(", ")}}` : "";
}

function shortNode(graph: Graph, id: number) {
  const node = graph.nodes.get(id);
  if (!node) return "(deleted)";
  const nameKey = NAME_KEYS.find((candidate) => candidate in node.props);
  const labels = node.labels.map((label) => `:${label}`).join("");
  return `(${labels}${nameKey ? ` {${nameKey}: ${display(node.props[nameKey], graph)}}` : ""})`;
}

export function display(value: Val | undefined, graph?: Graph): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return graph ? JSON.stringify(value) : value;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e6) / 1e6);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => display(item, graph ?? new Graph())).join(", ")}]`;
  if (value instanceof NodeRef) {
    const node = graph?.nodes.get(value.id);
    if (!node || !graph) return `node<${value.id}>`;
    return `(${node.labels.map((label) => `:${label}`).join("")}${showProps(node.props, graph)})`;
  }
  if (value instanceof RelRef) {
    const rel = graph?.rels.get(value.id);
    if (!rel || !graph) return `rel<${value.id}>`;
    return `[:${rel.type}${showProps(rel.props, graph)}]`;
  }
  if (value instanceof PathVal) {
    if (!graph) return "path";
    let text = shortNode(graph, value.nodes[0]);
    value.rels.forEach((relId, index) => {
      const rel = graph.rels.get(relId);
      const forward = rel?.start === value.nodes[index];
      text += `${forward ? "-" : "<-"}[:${rel?.type ?? "?"}]${forward ? "->" : "-"}${shortNode(graph, value.nodes[index + 1])}`;
    });
    return text;
  }
  return `{${Object.entries(value).map(([name, item]) => `${name}: ${display(item, graph ?? new Graph())}`).join(", ")}}`;
}

/* ───────────────────────────── Entry points ───────────────────────────── */

export function parseCypher(source: string) {
  return new Parser(lex(source), source).script();
}

/** Runs every statement of a script against the graph, mutating it. */
export function executeCypher(graph: Graph, source: string): RunResult {
  const started = performance.now();
  const outputs: RunOutput[] = [];
  let statements: Statement[];
  try {
    statements = parseCypher(source);
  } catch (error) {
    return { outputs, error: { message: error instanceof Error ? error.message : String(error) }, ms: performance.now() - started };
  }
  for (const statement of statements) {
    const executor = new Executor(graph);
    try {
      const output = executor.run(statement);
      const firstLine = statement.text.split("\n")[0];
      outputs.push({ ...output, title: statements.length > 1 ? firstLine : undefined });
    } catch (error) {
      return {
        outputs,
        error: { message: error instanceof Error ? error.message : String(error), statement: statement.text },
        ms: performance.now() - started,
      };
    }
  }
  return { outputs, ms: performance.now() - started };
}
