/**
 * Safe arithmetic expressions for widgets: a hand-written tokenizer and recursive-descent parser.
 * No eval, no Function, no property access. Grammar:
 *
 *   expr    := term (("+" | "-") term)*
 *   term    := unary (("*" | "/") unary)*
 *   unary   := "-" unary | power
 *   power   := primary ("^" unary)?          (right-associative; -2^2 = -4)
 *   primary := number | constant | variable | function "(" expr ("," expr)* ")" | "(" expr ")"
 */

export const MAX_EXPR_LENGTH = 200;

type Scope = Record<string, number>;
type Node = (scope: Scope) => number;

export type ParsedExpr =
  | { ok: true; variables: string[]; evaluate(scope: Record<string, number>): number }
  | { ok: false; error: string };

const UNARY: Record<string, (value: number) => number> = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};
const VARIADIC: Record<string, (...values: number[]) => number> = { min: Math.min, max: Math.max };
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

/** Words that cannot be used as variable names (functions and constants). */
export const RESERVED_WORDS: readonly string[] = [...Object.keys(UNARY), ...Object.keys(VARIADIC), ...Object.keys(CONSTANTS)];

type Token = { type: "num"; value: number } | { type: "id"; value: string } | { type: "op"; value: string };

class ExprError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const space = /^\s+/.exec(rest);
    if (space) {
      index += space[0].length;
      continue;
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
    if (number) {
      tokens.push({ type: "num", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (identifier) {
      tokens.push({ type: "id", value: identifier[0] });
      index += identifier[0].length;
      continue;
    }
    if ("+-*/^(),".includes(rest[0])) {
      tokens.push({ type: "op", value: rest[0] });
      index += 1;
      continue;
    }
    throw new ExprError(`Unexpected character "${rest[0]}" at position ${index + 1}.`);
  }
  return tokens;
}

function hasOwn(object: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, name);
}

export function parseExpr(source: string): ParsedExpr {
  if (typeof source !== "string" || source.trim() === "") return { ok: false, error: "The expression is empty." };
  if (source.length > MAX_EXPR_LENGTH) return { ok: false, error: `The expression is longer than ${MAX_EXPR_LENGTH} characters.` };

  try {
    const tokens = tokenize(source);
    const variables: string[] = [];
    let position = 0;

    const peek = (): Token | undefined => tokens[position];
    const isOp = (value: string) => peek()?.type === "op" && peek()?.value === value;
    const expectOp = (value: string) => {
      if (!isOp(value)) throw new ExprError(`Expected "${value}".`);
      position += 1;
    };

    function expression(): Node {
      let left = term();
      while (isOp("+") || isOp("-")) {
        const op = tokens[position++].value;
        const a = left;
        const b = term();
        left = op === "+" ? (scope) => a(scope) + b(scope) : (scope) => a(scope) - b(scope);
      }
      return left;
    }

    function term(): Node {
      let left = unary();
      while (isOp("*") || isOp("/")) {
        const op = tokens[position++].value;
        const a = left;
        const b = unary();
        left = op === "*" ? (scope) => a(scope) * b(scope) : (scope) => a(scope) / b(scope);
      }
      return left;
    }

    function unary(): Node {
      if (isOp("-")) {
        position += 1;
        const inner = unary();
        return (scope) => -inner(scope);
      }
      return power();
    }

    function power(): Node {
      const base = primary();
      if (isOp("^")) {
        position += 1;
        const exponent = unary();
        return (scope) => Math.pow(base(scope), exponent(scope));
      }
      return base;
    }

    function primary(): Node {
      const token = peek();
      if (!token) throw new ExprError("The expression ends too early.");
      if (token.type === "num") {
        position += 1;
        const value = token.value;
        return () => value;
      }
      if (token.type === "op" && token.value === "(") {
        position += 1;
        const inner = expression();
        expectOp(")");
        return inner;
      }
      if (token.type === "id") {
        position += 1;
        const name = token.value;
        if (hasOwn(UNARY, name) || hasOwn(VARIADIC, name)) {
          expectOp("(");
          const args = [expression()];
          while (isOp(",")) {
            position += 1;
            args.push(expression());
          }
          expectOp(")");
          if (hasOwn(UNARY, name)) {
            if (args.length !== 1) throw new ExprError(`${name}() takes one argument.`);
            const fn = UNARY[name];
            const [arg] = args;
            return (scope) => fn(arg(scope));
          }
          const fn = VARIADIC[name];
          return (scope) => fn(...args.map((arg) => arg(scope)));
        }
        if (hasOwn(CONSTANTS, name)) {
          const value = CONSTANTS[name];
          return () => value;
        }
        if (!variables.includes(name)) variables.push(name);
        return (scope) => (hasOwn(scope, name) && typeof scope[name] === "number" ? scope[name] : Number.NaN);
      }
      throw new ExprError(`Unexpected "${token.value}".`);
    }

    const root = expression();
    if (position !== tokens.length) throw new ExprError(`Unexpected "${String(tokens[position].value)}".`);
    return { ok: true, variables, evaluate: (scope) => root(scope) };
  } catch (error) {
    if (error instanceof ExprError) return { ok: false, error: error.message };
    throw error;
  }
}
