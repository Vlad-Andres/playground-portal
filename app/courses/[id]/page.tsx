import { notFound } from "next/navigation";
import { jobKey, readJob } from "@/lib/job";
import { readStorageFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function firstText(value: JsonObject, keys: string[]): string {
  for (const key of keys) {
    const candidate = text(value[key]);
    if (candidate) return candidate;
  }
  return "";
}

function paragraphs(markdown: string) {
  return markdown.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
    <p key={index}>{paragraph.replace(/^#+\s/, "")}</p>
  ));
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const job = await readJob(id);
  if (!job || job.status !== "completed") notFound();

  let lecture: JsonObject;
  try {
    lecture = JSON.parse((await readStorageFile(jobKey(id, "lecture.json"))).toString("utf8")) as JsonObject;
  } catch {
    notFound();
  }

  const content = object(lecture.lecture ?? lecture.course ?? lecture);
  const meta = object(content.meta ?? content);
  const concepts = Array.isArray(content.concepts) ? content.concepts : [];
  const sections = Array.isArray(content.sections) ? content.sections.map(object) : [];
  const objectives = list(meta.objectives);
  const takeaways = list(meta.takeaways);

  return (
    <main className="course-page">
      <header className="course-header">
        <a className="brand" href="/">✦ playground<span className="brand-dot">.</span></a>
        <span className="course-badge">Draft playground</span>
      </header>
      <section className="course-hero">
        <p className="eyebrow"><span className="eyebrow-line" /> Source-grounded course</p>
        <h1>{text(meta.title) || "Generated course"}</h1>
        <p className="course-subtitle">{text(meta.subtitle) || text(meta.summary)}</p>
        {objectives.length ? <div className="course-callout"><b>What you will learn</b><ul>{objectives.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      </section>
      {concepts.length ? (
        <section className="course-section">
          <div className="course-section-label">Key concepts</div>
          <div className="concept-grid">{concepts.map((rawConcept, index) => {
            const concept = object(rawConcept);
            const term = typeof rawConcept === "string" ? rawConcept : firstText(concept, ["term", "title", "name", "id"]);
            const detail = typeof rawConcept === "string" ? "" : firstText(concept, ["short", "detail", "description", "summary"]);
            return <article className="concept-card" key={term || index}><b>{term || "Key concept"}</b><p>{detail}</p></article>;
          })}</div>
        </section>
      ) : null}
      <section className="course-content">
        {sections.map((section, index) => {
          const rawBlocks = Array.isArray(section.blocks) ? section.blocks : Array.isArray(section.content) ? section.content : [];
          const blocks = rawBlocks.map(object);
          return <article className="lecture-section" key={text(section.id) || index}>
            <p className="course-section-label">Section {index + 1}</p>
            <h2>{firstText(section, ["title", "name", "heading"]) || "Lecture section"}</h2>
            {blocks.map((block, blockIndex) => {
              const kind = text(block.kind);
              const markdown = firstText(block, ["md", "text", "content", "description"]);
              if (kind === "prose" || kind === "info" || markdown) return <div className={`lecture-block ${kind || "prose"}`} key={blockIndex}>{kind === "info" ? <b>{firstText(block, ["title", "heading"])}</b> : null}{paragraphs(markdown)}</div>;
              if (kind === "list") return <ul className="lecture-list" key={blockIndex}>{list(block.items).map((item) => <li key={item}>{item}</li>)}</ul>;
              return null;
            })}
          </article>;
        })}
      </section>
      {takeaways.length ? <section className="course-callout"><b>Takeaways</b><ul>{takeaways.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
    </main>
  );
}
