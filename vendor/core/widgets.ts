import { z } from "zod";
import { parseExpr, RESERVED_WORDS } from "./expr";

export const WIDGET_TYPES = [
  // DIS labs (course-specific, no settings)
  "b-plus-tree-lab",
  "band-tuner",
  "clustering-lab",
  "clustering-threshold",
  "cypher-shakespeare-lab",
  "distance-lab",
  "er-pipeline",
  "extendible-hashing-lab",
  "fragmentation-lab",
  "greenplum-explorer",
  "hash-spread-lab",
  "join-strategy-explorer",
  "lazy-evaluation-lab",
  "map-reduce-lab",
  "minhash-lab",
  "pair-cost-calculator",
  "quorum-lab",
  "rdf-storage-lab",
  "replica-placement-lab",
  "replica-quorum-lab",
  "semi-join-bloom-lab",
  "shingling-explorer",
  "string-similarity-lab",
  "two-phase-commit-simulator",
  "vector-search-lab",
  // Generic, JSON-configured widgets
  "order-items",
  "match-pairs",
  "categorize",
  "cloze",
  "flow-stepper",
  "concept-map",
  "chart",
  "parameter-explorer",
  "function-plot",
  "mock-exam",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export function isWidgetType(type: string): type is WidgetType {
  return (WIDGET_TYPES as readonly string[]).includes(type);
}

export interface WidgetSpec {
  title: string;
  pack: "core" | "math" | "dis";
  /** One sentence saying when to use the widget. Shown to the model. */
  description: string;
  props: z.ZodType;
  example: Record<string, unknown>;
}

const text = z.string().trim().min(1);
/** Ids that are also expression variables. */
const variableId = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use letters, digits and _ only, starting with a letter.")
  .refine((id) => !RESERVED_WORDS.includes(id), "This name is reserved for a function or constant.");

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function uniqueIssue(ctx: z.RefinementCtx, values: string[], path: (string | number)[], what: string): void {
  for (const value of new Set(duplicates(values))) {
    ctx.addIssue({ code: "custom", path, message: `Duplicate ${what} "${value}".` });
  }
}

export const orderItemsProps = z
  .object({ prompt: text, items: z.array(text).min(3).max(8), explanation: z.string().optional() })
  .strict()
  .superRefine((value, ctx) => uniqueIssue(ctx, value.items, ["items"], "item"));

export const matchPairsProps = z
  .object({
    prompt: z.string().optional(),
    pairs: z.array(z.object({ left: text, right: text }).strict()).min(3).max(8),
  })
  .strict()
  .superRefine((value, ctx) => {
    uniqueIssue(ctx, value.pairs.map((pair) => pair.left), ["pairs"], "left item");
    uniqueIssue(ctx, value.pairs.map((pair) => pair.right), ["pairs"], "right item");
  });

export const categorizeProps = z
  .object({
    prompt: z.string().optional(),
    categories: z.array(text).min(2).max(4),
    items: z.array(z.object({ text, category: text }).strict()).min(4).max(12),
  })
  .strict()
  .superRefine((value, ctx) => {
    uniqueIssue(ctx, value.categories, ["categories"], "category");
    uniqueIssue(ctx, value.items.map((item) => item.text), ["items"], "item");
    value.items.forEach((item, index) => {
      if (!value.categories.includes(item.category)) {
        ctx.addIssue({ code: "custom", path: ["items", index, "category"], message: `"${item.category}" is not one of the categories.` });
      }
    });
  });

export const CLOZE_GAP = /\{\{([^{}]+)\}\}/g;

export const clozeProps = z
  .object({ text, distractors: z.array(text).max(6).optional() })
  .strict()
  .superRefine((value, ctx) => {
    const gaps = [...value.text.matchAll(CLOZE_GAP)].map((match) => match[1].trim()).filter(Boolean);
    if (gaps.length < 1 || gaps.length > 8) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Write 1 to 8 gaps as {{answer}}." });
    }
  });

const graphNodeId = z.string().trim().min(1).max(40);

export const flowStepperProps = z
  .object({
    nodes: z.array(z.object({ id: graphNodeId, label: text, detail: z.string().optional() }).strict()).min(2).max(12),
    edges: z.array(z.object({ from: graphNodeId, to: graphNodeId, label: z.string().optional() }).strict()).max(24),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.nodes.map((node) => node.id);
    uniqueIssue(ctx, ids, ["nodes"], "node id");
    value.edges.forEach((edge, index) => {
      if (!ids.includes(edge.from)) ctx.addIssue({ code: "custom", path: ["edges", index, "from"], message: `Unknown node "${edge.from}".` });
      if (!ids.includes(edge.to)) ctx.addIssue({ code: "custom", path: ["edges", index, "to"], message: `Unknown node "${edge.to}".` });
    });
  });

export const conceptMapProps = z
  .object({
    nodes: z.array(z.object({ id: graphNodeId, label: text }).strict()).min(3).max(14),
    links: z.array(z.object({ from: graphNodeId, to: graphNodeId, label: text }).strict()).max(30),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.nodes.map((node) => node.id);
    uniqueIssue(ctx, ids, ["nodes"], "node id");
    value.links.forEach((link, index) => {
      if (!ids.includes(link.from)) ctx.addIssue({ code: "custom", path: ["links", index, "from"], message: `Unknown node "${link.from}".` });
      if (!ids.includes(link.to)) ctx.addIssue({ code: "custom", path: ["links", index, "to"], message: `Unknown node "${link.to}".` });
    });
  });

export const chartProps = z
  .object({
    type: z.enum(["bar", "line"]),
    title: z.string().optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
    labels: z.array(z.string()).min(2).max(24),
    series: z.array(z.object({ name: text, values: z.array(z.number()) }).strict()).min(1).max(4),
  })
  .strict()
  .superRefine((value, ctx) => {
    value.series.forEach((series, index) => {
      if (series.values.length !== value.labels.length) {
        ctx.addIssue({ code: "custom", path: ["series", index, "values"], message: `Give exactly ${value.labels.length} values, one per label.` });
      }
    });
  });

function rangeIssues(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  range: { min: number; max: number; value: number },
): void {
  if (!(range.min < range.max)) ctx.addIssue({ code: "custom", path: [...path, "min"], message: "min must be smaller than max." });
  if (range.value < range.min || range.value > range.max) {
    ctx.addIssue({ code: "custom", path: [...path, "value"], message: "value must be between min and max." });
  }
}

function exprIssues(ctx: z.RefinementCtx, path: (string | number)[], source: string, allowed: string[]): void {
  const parsed = parseExpr(source);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", path, message: `Expression error: ${parsed.error}` });
    return;
  }
  for (const name of parsed.variables) {
    if (!allowed.includes(name)) ctx.addIssue({ code: "custom", path, message: `Unknown variable "${name}". Use only: ${allowed.join(", ")}.` });
  }
}

export const parameterExplorerProps = z
  .object({
    inputs: z
      .array(
        z
          .object({
            id: variableId,
            label: text,
            min: z.number(),
            max: z.number(),
            step: z.number().positive(),
            value: z.number(),
            unit: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    outputs: z
      .array(
        z
          .object({ label: text, expr: text, unit: z.string().optional(), decimals: z.number().int().min(0).max(6).optional() })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.inputs.map((input) => input.id);
    uniqueIssue(ctx, ids, ["inputs"], "input id");
    value.inputs.forEach((input, index) => rangeIssues(ctx, ["inputs", index], input));
    value.outputs.forEach((output, index) => exprIssues(ctx, ["outputs", index, "expr"], output.expr, ids));
  });

export const functionPlotProps = z
  .object({
    expr: text,
    xMin: z.number(),
    xMax: z.number(),
    params: z
      .array(z.object({ id: variableId, label: text, min: z.number(), max: z.number(), value: z.number() }).strict())
      .max(3)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!(value.xMin < value.xMax)) ctx.addIssue({ code: "custom", path: ["xMin"], message: "xMin must be smaller than xMax." });
    const params = value.params ?? [];
    const ids = params.map((param) => param.id);
    uniqueIssue(ctx, ids, ["params"], "parameter id");
    params.forEach((param, index) => {
      if (param.id === "x") ctx.addIssue({ code: "custom", path: ["params", index, "id"], message: '"x" is the plot variable.' });
      rangeIssues(ctx, ["params", index], param);
    });
    exprIssues(ctx, ["expr"], value.expr, ["x", ...ids]);
  });

export const mockExamProps = z
  .object({ questionCount: z.number().int().min(5).max(60).optional(), minutes: z.number().int().min(5).max(180).optional() })
  .strict();

export type OrderItemsProps = z.infer<typeof orderItemsProps>;
export type MatchPairsProps = z.infer<typeof matchPairsProps>;
export type CategorizeProps = z.infer<typeof categorizeProps>;
export type ClozeProps = z.infer<typeof clozeProps>;
export type FlowStepperProps = z.infer<typeof flowStepperProps>;
export type ConceptMapProps = z.infer<typeof conceptMapProps>;
export type ChartProps = z.infer<typeof chartProps>;
export type ParameterExplorerProps = z.infer<typeof parameterExplorerProps>;
export type FunctionPlotProps = z.infer<typeof functionPlotProps>;
export type MockExamProps = z.infer<typeof mockExamProps>;

const emptyProps = z.object({}).strict();

function lab(title: string, description: string): WidgetSpec {
  return { title, pack: "dis", description, props: emptyProps, example: {} };
}

export const widgetCatalogue: Record<WidgetType, WidgetSpec> = {
  "b-plus-tree-lab": lab("B+ tree lab", "DIS course lab: B+ tree inserts and splits."),
  "band-tuner": lab("Band tuner", "DIS course lab: LSH band and row tuning."),
  "clustering-lab": lab("Clustering lab", "DIS course lab: clustering."),
  "clustering-threshold": lab("Clustering threshold", "DIS course lab: clustering thresholds."),
  "cypher-shakespeare-lab": lab("Cypher Shakespeare lab", "DIS course lab: Cypher queries."),
  "distance-lab": lab("Distance lab", "DIS course lab: distance measures."),
  "er-pipeline": lab("Entity-resolution pipeline", "DIS course lab: entity resolution."),
  "extendible-hashing-lab": lab("Extendible hashing lab", "DIS course lab: extendible hashing."),
  "fragmentation-lab": lab("Fragmentation lab", "DIS course lab: fragmentation."),
  "greenplum-explorer": lab("Greenplum explorer", "DIS course lab: Greenplum distribution."),
  "hash-spread-lab": lab("Hash spread lab", "DIS course lab: hash spreading."),
  "join-strategy-explorer": lab("Join strategy explorer", "DIS course lab: distributed joins."),
  "lazy-evaluation-lab": lab("Lazy evaluation lab", "DIS course lab: lazy evaluation."),
  "map-reduce-lab": lab("MapReduce lab", "DIS course lab: MapReduce."),
  "minhash-lab": lab("Minhash lab", "DIS course lab: minhashing."),
  "pair-cost-calculator": lab("Pair cost calculator", "DIS course lab: pair comparison cost."),
  "quorum-lab": lab("Quorum lab", "DIS course lab: quorums."),
  "rdf-storage-lab": lab("RDF storage lab", "DIS course lab: RDF storage."),
  "replica-placement-lab": lab("Replica placement lab", "DIS course lab: replica placement."),
  "replica-quorum-lab": lab("Replica quorum lab", "DIS course lab: replica quorums."),
  "semi-join-bloom-lab": lab("Semijoin bloom lab", "DIS course lab: semijoins with Bloom filters."),
  "shingling-explorer": lab("Shingling explorer", "DIS course lab: shingling."),
  "string-similarity-lab": lab("String similarity lab", "DIS course lab: string similarity."),
  "two-phase-commit-simulator": lab("Two-phase commit simulator", "DIS course lab: two-phase commit."),
  "vector-search-lab": lab("Vector search lab", "DIS course lab: vector search."),

  "order-items": {
    title: "Put in order",
    pack: "core",
    description: "Use when the material has a fixed sequence (process steps, stages, a chronology) the learner should be able to reproduce.",
    props: orderItemsProps,
    example: {
      prompt: "Put the phases of mitosis in order.",
      items: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
      explanation: "Chromosomes condense, line up, separate, then two nuclei form.",
    },
  },
  "match-pairs": {
    title: "Match the pairs",
    pack: "core",
    description: "Use for one-to-one associations: term ↔ definition, word ↔ translation, cause ↔ effect, symbol ↔ meaning.",
    props: matchPairsProps,
    example: {
      prompt: "Match each organelle with its job.",
      pairs: [
        { left: "Mitochondrion", right: "Makes ATP" },
        { left: "Ribosome", right: "Builds proteins" },
        { left: "Nucleus", right: "Stores DNA" },
      ],
    },
  },
  categorize: {
    title: "Sort into groups",
    pack: "core",
    description: "Use when items belong to 2–4 classes the learner must tell apart (types, families, true/false groups).",
    props: categorizeProps,
    example: {
      prompt: "Sort the examples.",
      categories: ["Renewable", "Non-renewable"],
      items: [
        { text: "Wind", category: "Renewable" },
        { text: "Coal", category: "Non-renewable" },
        { text: "Solar", category: "Renewable" },
        { text: "Natural gas", category: "Non-renewable" },
      ],
    },
  },
  cloze: {
    title: "Fill the gaps",
    pack: "core",
    description: "Use for a key definition or rule whose exact wording matters; each {{gap}} hides one important word.",
    props: clozeProps,
    example: {
      text: "Photosynthesis turns {{carbon dioxide}} and water into {{glucose}} using light energy.",
      distractors: ["oxygen", "starch"],
    },
  },
  "flow-stepper": {
    title: "Step through the flow",
    pack: "core",
    description: "Use for a process, pipeline or decision flow where each step deserves a short explanation.",
    props: flowStepperProps,
    example: {
      nodes: [
        { id: "request", label: "Request", detail: "The client sends an HTTP request." },
        { id: "server", label: "Server", detail: "The server **routes** it to a handler." },
        { id: "response", label: "Response", detail: "A status code and body come back." },
      ],
      edges: [
        { from: "request", to: "server" },
        { from: "server", to: "response", label: "200 OK" },
      ],
    },
  },
  "concept-map": {
    title: "Concept map",
    pack: "core",
    description: "Use to show how 3–14 key ideas relate to each other through labelled links.",
    props: conceptMapProps,
    example: {
      nodes: [
        { id: "supply", label: "Supply" },
        { id: "demand", label: "Demand" },
        { id: "price", label: "Price" },
      ],
      links: [
        { from: "demand", to: "price", label: "raises" },
        { from: "supply", to: "price", label: "lowers" },
      ],
    },
  },
  chart: {
    title: "Chart",
    pack: "core",
    description: "Use when the material gives numbers to compare (bar) or a trend over time or a variable (line).",
    props: chartProps,
    example: {
      type: "bar",
      title: "Population by continent (billions)",
      yLabel: "Billions",
      labels: ["Asia", "Africa", "Europe"],
      series: [{ name: "2020", values: [4.6, 1.3, 0.75] }],
    },
  },
  "parameter-explorer": {
    title: "Parameter explorer",
    pack: "math",
    description: "Use for a formula with 1–4 inputs so the learner can move sliders and watch the results change.",
    props: parameterExplorerProps,
    example: {
      inputs: [
        { id: "m", label: "Mass", min: 1, max: 100, step: 1, value: 10, unit: "kg" },
        { id: "v", label: "Speed", min: 0, max: 30, step: 0.5, value: 5, unit: "m/s" },
      ],
      outputs: [{ label: "Kinetic energy", expr: "0.5 * m * v^2", unit: "J", decimals: 1 }],
    },
  },
  "function-plot": {
    title: "Function plot",
    pack: "math",
    description: "Use to plot a function of x, optionally with up to 3 parameter sliders, to build intuition for its shape.",
    props: functionPlotProps,
    example: {
      expr: "a * sin(b * x)",
      xMin: -6.28,
      xMax: 6.28,
      params: [
        { id: "a", label: "Amplitude", min: 0.5, max: 3, value: 1 },
        { id: "b", label: "Frequency", min: 0.5, max: 4, value: 1 },
      ],
    },
  },
  "mock-exam": {
    title: "Mock exam",
    pack: "core",
    description: "Use once, in the exam page: a timed quiz drawn from all lecture quizzes.",
    props: mockExamProps,
    example: { questionCount: 20, minutes: 30 },
  },
};

/** Backwards-compatible view used by the validator. */
export const widgetManifest: Record<WidgetType, { title: string; props: z.ZodType }> = widgetCatalogue;

/** Every widget the generator may use: all except the DIS labs. */
export const generatorWidgetTypes: WidgetType[] = WIDGET_TYPES.filter((type) => widgetCatalogue[type].pack !== "dis");
