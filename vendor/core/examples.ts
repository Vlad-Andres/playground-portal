import type { Block } from "./schema";

export interface BlockExample {
  /** When to use this block. */
  use: string;
  /** When not to use it. */
  avoid: string;
  example: Block;
}

const src = [{ file: "slides.pdf", page: 4 }];

export const blockExamples: { [K in Block["kind"]]: BlockExample & { example: Extract<Block, { kind: K }> } } = {
  prose: {
    use: "Short explanatory text (at most 80 words) that connects the other blocks.",
    avoid: "Lists of facts, comparisons or sequences — use list, table, steps or timeline instead.",
    example: { kind: "prose", md: "An **index** is a separate structure that maps key values to row locations, so a lookup does not scan the whole table.", source: src },
  },
  info: {
    use: "A callout: a note, an insight, a warning or a common pitfall the learner should not miss.",
    avoid: "Ordinary explanation; more than one callout in a row.",
    example: { kind: "info", variant: "pitfall", title: "Correlation is not causation", md: "Two variables moving together does not show that one causes the other.", source: src },
  },
  concepts: {
    use: "Show the lecture's defined concepts as cards. Every id must exist in the lecture's `concepts` list.",
    avoid: "Ids that are not defined in `concepts`.",
    example: { kind: "concepts", ids: ["index", "selectivity"], source: src },
  },
  formula: {
    use: "A formula worth remembering, in KaTeX syntax, with a caption that names the symbols.",
    avoid: "Inline maths inside prose (write $x^2$ in Markdown instead).",
    example: { kind: "formula", tex: "E_k = \\tfrac{1}{2} m v^2", caption: "Kinetic energy: m is the mass, v the speed.", source: src },
  },
  code: {
    use: "A code or query example from the material. Set `run` only for SQL, Cypher or Gremlin that the site can execute.",
    avoid: "Pseudo-code that is really a sequence of steps — use steps.",
    example: { kind: "code", lang: "python", code: "def mean(values):\n    return sum(values) / len(values)", caption: "The arithmetic mean.", run: false, source: src },
  },
  table: {
    use: "Comparisons and structured facts: rows of items, columns of properties.",
    avoid: "A single column of items — use list.",
    example: {
      kind: "table",
      headers: ["Structure", "Lookup", "Range scan"],
      rows: [
        ["Hash index", "O(1)", "No"],
        ["B+ tree", "O(log n)", "Yes"],
      ],
      caption: "Index structures compared.",
      source: src,
    },
  },
  figure: {
    use: "An image that is already in the content's figures/ folder.",
    avoid: "Images you cannot point at a real file; generated courses do not have figures yet.",
    example: { kind: "figure", src: "diagram.png", alt: "Diagram of the three-tier architecture", width: 1200, height: 800, caption: "Three-tier architecture.", source: src },
  },
  steps: {
    use: "A worked example or procedure with numbered steps, each with a short Markdown explanation.",
    avoid: "Steps without explanation — use the order-items widget to practise a sequence.",
    example: {
      kind: "steps",
      title: "Solving 2x + 3 = 11",
      intro: "Isolate x one operation at a time.",
      steps: [
        { title: "Subtract 3", md: "2x = 8" },
        { title: "Divide by 2", md: "x = 4" },
      ],
      source: src,
    },
  },
  timeline: {
    use: "Events or stages in time order, each with a label (date or stage) and a short text.",
    avoid: "Things that are not ordered in time.",
    example: {
      kind: "timeline",
      items: [
        { label: "1970", title: "Relational model", md: "Codd publishes the relational model." },
        { label: "1974", title: "SQL", md: "SEQUEL, later SQL, is designed at IBM." },
      ],
      source: src,
    },
  },
  list: {
    use: "Learning objectives at the start of a lecture, or key takeaways at the end.",
    avoid: "Any other kind of list — write it in prose Markdown or a table.",
    example: { kind: "list", variant: "takeaways", items: ["Indexes speed up reads and slow down writes.", "Choose the index type by the query pattern."], source: src },
  },
  exercises: {
    use: "An exercise sheet from the material: several exercises, each with checked tasks and model solutions.",
    avoid: "One or two questions — use practice.",
    example: {
      kind: "exercises",
      sheet: {
        id: "sheet-1",
        title: "Exercise sheet 1",
        description: "Indexes and selectivity.",
        source: "Tutorial 1",
        exercises: [
          {
            id: "ex-1",
            title: "Selectivity",
            tasks: [
              {
                id: "ex-1-a",
                prompt: "A query returns 50 of 1,000 rows. What is its selectivity?",
                check: { mode: "text", accept: ["0.05", "5%"] },
                solution: "50 / 1000 = 0.05.",
              },
            ],
          },
        ],
      },
      source: src,
    },
  },
  recall: {
    use: "Flashcards for active recall: a prompt and its answer.",
    avoid: "Long answers (keep each under 40 words).",
    example: {
      kind: "recall",
      cards: [
        { prompt: "What does an index trade for faster reads?", answer: "Extra storage and slower writes." },
        { prompt: "Which index supports range scans?", answer: "A B+ tree." },
      ],
      source: src,
    },
  },
  practice: {
    use: "A few practice tasks with checks: `select` (choose from options), `text` (accepted answers) or `open` (self-checked against the solution).",
    avoid: "Answers in `select` that are not among its options.",
    example: {
      kind: "practice",
      id: "practice-indexes",
      tasks: [
        {
          id: "p1",
          prompt: "Which structure answers `WHERE age BETWEEN 20 AND 30` best?",
          check: { mode: "select", options: ["Hash index", "B+ tree"], answer: ["B+ tree"] },
          solution: "A B+ tree keeps keys sorted, so a range is one scan.",
          hint: "Which one keeps keys in order?",
        },
        { id: "p2", prompt: "Explain in one sentence why indexes slow down inserts.", check: { mode: "open" }, solution: "Every insert must also update each index." },
      ],
      source: src,
    },
  },
  widget: {
    use: "An interactive widget from the widget catalogue; `props` must match that widget's schema.",
    avoid: "Widgets that do not fit the content, or more than one widget per section.",
    example: {
      kind: "widget",
      type: "order-items",
      title: "Put the steps in order",
      props: { prompt: "Order the steps of a query.", items: ["Parse", "Optimise", "Execute"] },
      source: src,
    },
  },
};
