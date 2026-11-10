"use client";

import { useEffect, useState } from "react";

type JsonObject = Record<string, unknown>;

interface CourseRuntimeProps {
  id: string;
  title: string;
  subtitle: string;
  objectives: string[];
  takeaways: string[];
  concepts: unknown[];
  sections: JsonObject[];
  quiz: JsonObject[];
  examPreparation: boolean;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function records(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function firstText(value: JsonObject, keys: string[]): string {
  for (const key of keys) {
    const candidate = text(value[key]);
    if (candidate) return candidate;
  }
  return "";
}

function humanText(value: unknown, depth = 0): string {
  if (depth > 3) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => humanText(item, depth + 1)).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(object(value))
    .filter(([key]) => !["id", "kind", "type", "slug", "number"].includes(key))
    .map(([, item]) => humanText(item, depth + 1))
    .filter(Boolean)
    .join(" ");
}

function paragraphs(markdown: string) {
  return markdown.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
    <p key={index}>{paragraph.replace(/^#+\s/, "")}</p>
  ));
}

function blockText(block: JsonObject): string {
  return firstText(block, ["md", "text", "content", "description", "body"]) || humanText(block);
}

export default function CourseRuntime(props: CourseRuntimeProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const storageKey = `playground-course-progress:${props.id}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) setCompleted(saved.filter((item): item is string => typeof item === "string"));
    } catch {
      // Progress is optional; the course remains usable if browser storage is unavailable.
    }
  }, [storageKey]);

  function toggleSection(sectionId: string) {
    setCompleted((current) => {
      const next = current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Keep the in-session state when persistent browser storage is unavailable.
      }
      return next;
    });
  }

  const progress = props.sections.length ? completed.filter((id) => props.sections.some((section) => text(section.id) === id)).length / props.sections.length : 0;
  const quizScore = props.quiz.reduce((score, question, index) => {
    const answer = answers[text(question.id) || String(index)];
    return score + (submitted && answer && answer === text(question.answerId) ? 1 : 0);
  }, 0);

  return (
    <main className="course-page">
      <header className="course-header">
        <a className="brand" href="/">✦ playground<span className="brand-dot">.</span></a>
        <span className="course-badge">Interactive draft</span>
      </header>
      <section className="course-hero">
        <p className="eyebrow"><span className="eyebrow-line" /> Source-grounded course</p>
        <h1>{props.title || "Generated course"}</h1>
        <p className="course-subtitle">{props.subtitle}</p>
        <div className="progress-card">
          <div><b>Your progress</b><span>{Math.round(progress * 100)}% complete</span></div>
          <div className="progress-track"><div style={{ width: `${progress * 100}%` }} /></div>
        </div>
        {props.objectives.length ? <div className="course-callout"><b>What you will learn</b><ul>{props.objectives.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      </section>
      {props.concepts.length ? (
        <section className="course-section">
          <div className="course-section-label">Key concepts</div>
          <div className="concept-grid">{props.concepts.map((rawConcept, index) => {
            const concept = object(rawConcept);
            const term = typeof rawConcept === "string" ? rawConcept : firstText(concept, ["term", "title", "name", "label"]) || `Concept ${index + 1}`;
            const detail = typeof rawConcept === "string" ? "" : firstText(concept, ["short", "detail", "description", "summary"]) || humanText(rawConcept);
            return <article className="concept-card" key={term || index}><b>{term}</b><p>{detail}</p></article>;
          })}</div>
        </section>
      ) : null}
      <nav className="course-toc" aria-label="Course sections">
        {props.sections.map((section, index) => <a key={text(section.id) || index} href={`#${text(section.id) || `section-${index}`}`}>{index + 1}. {firstText(section, ["title", "name", "heading"]) || "Section"}</a>)}
      </nav>
      <section className="course-content">
        {props.sections.map((section, index) => {
          const sectionId = text(section.id) || `section-${index}`;
          const blocks = records(section.blocks ?? section.content ?? section.items).map(object);
          const isDone = completed.includes(sectionId);
          return <article className="lecture-section" id={sectionId} key={sectionId}>
            <p className="course-section-label">Section {index + 1}</p>
            <h2>{firstText(section, ["title", "name", "heading", "sectionTitle"]) || humanText(section).slice(0, 120) || "Lecture section"}</h2>
            {blocks.map((block, blockIndex) => {
              const kind = text(block.kind);
              if (kind === "figure") return <figure className="course-figure" key={blockIndex}><img src={text(block.src)} alt={text(block.alt)} /><figcaption>{text(block.caption)}</figcaption></figure>;
              if (kind === "formula") return <div className="formula-block" key={blockIndex}><code>{text(block.tex)}</code>{text(block.caption) ? <small>{text(block.caption)}</small> : null}</div>;
              if (kind === "code") return <pre className="code-block" key={blockIndex}><code>{text(block.code)}</code></pre>;
              if (kind === "table") {
                const headers = records(block.headers).map(String);
                const rows = records(block.rows).map((row) => records(row).map(String));
                return <div className="table-wrap" key={blockIndex}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
              }
              if (kind === "steps") return <div className="steps-block" key={blockIndex}>{records(block.steps).map((rawStep, stepIndex) => { const step = object(rawStep); return <div key={stepIndex}><b>{stepIndex + 1}. {firstText(step, ["title", "name"])}</b>{paragraphs(firstText(step, ["md", "text", "content"]))}</div>; })}</div>;
              if (kind === "timeline") return <div className="timeline-block" key={blockIndex}>{records(block.items).map((rawItem, itemIndex) => { const item = object(rawItem); return <div key={itemIndex}><b>{firstText(item, ["label", "title"])}</b>{paragraphs(firstText(item, ["md", "text", "content"]))}</div>; })}</div>;
              if (kind === "recall") return <div className="recall-grid" key={blockIndex}>{records(block.cards).map((rawCard, cardIndex) => { const card = object(rawCard); return <details key={cardIndex}><summary>{firstText(card, ["prompt", "question"])}</summary><p>{firstText(card, ["answer", "response"])}</p></details>; })}</div>;
              if (kind === "list") return <ul className="lecture-list" key={blockIndex}>{records(block.items).map((item) => <li key={String(item)}>{humanText(item)}</li>)}</ul>;
              const content = blockText(block);
              return content ? <div className={`lecture-block ${kind || "prose"}`} key={blockIndex}>{kind === "info" ? <b>{firstText(block, ["title", "heading"])}</b> : null}{paragraphs(content)}</div> : null;
            })}
            <button type="button" className={`complete-button ${isDone ? "done" : ""}`} onClick={() => toggleSection(sectionId)}>
              {isDone ? "✓ Lesson complete" : "○ Mark lesson complete"}
            </button>
          </article>;
        })}
      </section>
      {props.quiz.length ? (
        <section className="quiz-panel">
          <div className="course-section-label">Check your understanding</div>
          {props.quiz.map((rawQuestion, index) => {
            const question = object(rawQuestion);
            const questionId = text(question.id) || String(index);
            const options = records(question.options).map(object);
            return <fieldset key={questionId}><legend>{index + 1}. {firstText(question, ["prompt", "question"]) || humanText(question)}</legend>{options.map((option, optionIndex) => {
              const optionId = text(option.id) || String(optionIndex);
              return <label key={optionId}><input type="radio" name={questionId} checked={answers[questionId] === optionId} onChange={() => setAnswers((current) => ({ ...current, [questionId]: optionId }))} />{firstText(option, ["text", "label"]) || humanText(option)}</label>;
            })}</fieldset>;
          })}
          <button type="button" className="primary-button quiz-submit" onClick={() => setSubmitted(true)}>Check answers</button>
          {submitted ? <p className="quiz-result">Score: {quizScore} / {props.quiz.length}</p> : null}
        </section>
      ) : null}
      {props.examPreparation && props.quiz.length ? <section className="course-callout"><b>Exam preparation</b><p>Use the questions above as a first recall pass, then revisit any lesson you have not marked complete.</p></section> : null}
      {props.takeaways.length ? <section className="course-callout"><b>Takeaways</b><ul>{props.takeaways.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
    </main>
  );
}
