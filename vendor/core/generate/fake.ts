import { fakeModel, type ModelClient } from "./model";
import { TASK } from "./prompts";

/** Pages named in a prompt, e.g. "=== slides.pdf — page 3 ===". */
function pagesIn(text: string): { file: string; page: number }[] {
  return [...text.matchAll(/^=== (.+) — page (\d+) ===$/gm)].map((match) => ({ file: match[1], page: Number(match[2]) }));
}

/** A canned model that returns a small but complete course: for CLI tests and offline demos. */
export function cannedModel(): ModelClient {
  return fakeModel((request) => {
    const pages = pagesIn(request.user);
    const source = pages.slice(0, 1).length ? pages.slice(0, 1) : [{ file: "material.txt", page: 1 }];
    if (request.system.startsWith(TASK.plan)) {
      const files = [...new Set(pages.map((page) => page.file))];
      return JSON.stringify({
        course: { id: "sample-course", title: "Sample course", shortTitle: "Sample", description: "Generated with the canned model.", language: "en", indexable: false, domains: ["core"] },
        lectures: files.map((file, index) => {
          const filePages = pages.filter((page) => page.file === file).map((page) => page.page);
          return {
            number: index + 1,
            slug: `part-${index + 1}`,
            title: `Part ${index + 1}`,
            summary: `Everything in ${file}.`,
            pages: [{ file, from: Math.min(...filePages), to: Math.max(...filePages) }],
            sections: [
              { id: "goals", title: "Goals", kind: "objectives", blocks: ["list"] },
              { id: "ideas", title: "Key ideas", kind: "concepts", blocks: ["prose", "concepts", "table"] },
              { id: "practice", title: "Practice", kind: "quiz", blocks: ["recall", "practice", "widget"] },
            ],
          };
        }),
        exam: { title: "Exam training", intro: "Practise with questions from every part." },
      });
    }
    if (request.system.startsWith(TASK.lecture)) {
      const ids = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"];
      return JSON.stringify({
        meta: {
          slug: "x",
          number: 1,
          title: "Part",
          subtitle: "Canned",
          summary: "A canned lecture.",
          topics: ["sample"],
          difficulty: "intro",
          estimatedMinutes: 15,
          sources: [{ label: source[0].file, kind: "notes", detail: source[0].file }],
          objectives: ["Read the sample."],
          takeaways: ["The pipeline works."],
        },
        concepts: ids.map((id) => ({ id, term: id[0].toUpperCase() + id.slice(1), short: `The ${id} idea.` })),
        quiz: ids.map((id, index) => ({
          id: `q${index + 1}`,
          prompt: `What is ${id}?`,
          options: [
            { id: "a", text: `The ${id} idea` },
            { id: "b", text: "Something else" },
          ],
          answerId: "a",
          explanation: `It is the ${id} idea.`,
        })),
        sections: [
          { id: "goals", title: "Goals", kind: "objectives", blocks: [{ kind: "list", variant: "objectives", items: ["Read the sample."], source }] },
          {
            id: "ideas",
            title: "Key ideas",
            kind: "concepts",
            blocks: [
              { kind: "prose", md: "A short explanation.", source },
              { kind: "concepts", ids: ids.slice(0, 3), source },
              { kind: "table", headers: ["Idea", "Meaning"], rows: [["Alpha", "First"], ["Beta", "Second"]], source },
              { kind: "steps", title: "How it works", steps: [{ title: "One", md: "First." }, { title: "Two", md: "Second." }], source },
            ],
          },
          {
            id: "practice",
            title: "Practice",
            kind: "quiz",
            blocks: [
              { kind: "recall", cards: [{ prompt: "Alpha?", answer: "The first idea." }], source },
              { kind: "practice", id: "practice-1", tasks: [{ id: "t1", prompt: "Pick alpha", check: { mode: "select", options: ["alpha", "beta"], answer: ["alpha"] }, solution: "alpha" }], source },
              { kind: "widget", type: "order-items", title: "Put in order", props: { prompt: "Order the letters.", items: ["Alpha", "Beta", "Gamma"] }, source },
              { kind: "widget", type: "match-pairs", title: "Match", props: { pairs: [{ left: "A", right: "Alpha" }, { left: "B", right: "Beta" }, { left: "G", right: "Gamma" }] }, source },
            ],
          },
        ],
      });
    }
    if (request.system.startsWith(TASK.repair)) return JSON.stringify({ items: [] });
    return JSON.stringify({ concepts: [], quiz: [], blocks: [] });
  });
}
