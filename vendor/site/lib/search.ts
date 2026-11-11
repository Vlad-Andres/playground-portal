import type { Concept, LectureMeta } from "@site/content/types";

export type SearchRecordType = "lecture" | "section" | "concept" | "objective";

export interface SearchRecord {
  id: string;
  type: SearchRecordType;
  title: string;
  excerpt: string;
  href: string;
  lectureNumber: number;
  lectureTitle: string;
  keywords: string;
}

const TYPE_WEIGHT: Record<SearchRecordType, number> = {
  lecture: 4,
  concept: 3,
  section: 2,
  objective: 1,
};

export function buildSearchRecords(
  entries: { meta: LectureMeta; concepts: Concept[] }[],
  lectureHref: (slug: string) => string,
): SearchRecord[] {
  return entries.flatMap(({ meta, concepts }) => {
    const base = { lectureNumber: meta.number, lectureTitle: meta.title };
    const href = lectureHref(meta.slug);

    const lectureRecord: SearchRecord = {
      ...base,
      id: `lecture:${meta.slug}`,
      type: "lecture",
      title: meta.title,
      excerpt: meta.summary,
      href,
      keywords: [meta.title, meta.subtitle, meta.summary, ...meta.topics].join(" "),
    };

    const sectionRecords = meta.outline.map<SearchRecord>((section) => ({
      ...base,
      id: `section:${meta.slug}:${section.id}`,
      type: "section",
      title: section.title,
      excerpt: `Section of Lecture ${meta.number}`,
      href: `${href}#${section.id}`,
      keywords: section.title,
    }));

    const conceptRecords = concepts.map<SearchRecord>((concept) => ({
      ...base,
      id: `concept:${meta.slug}:${concept.id}`,
      type: "concept",
      title: concept.term,
      excerpt: concept.short,
      href: `${href}#concept-${concept.id}`,
      keywords: [concept.term, concept.short, concept.detail, ...(concept.tags ?? [])]
        .filter(Boolean)
        .join(" "),
    }));

    const objectiveRecords = meta.objectives.map<SearchRecord>((objective, index) => ({
      ...base,
      id: `objective:${meta.slug}:${index}`,
      type: "objective",
      title: objective,
      excerpt: `Learning objective of Lecture ${meta.number}`,
      href: `${href}#objectives`,
      keywords: objective,
    }));

    return [lectureRecord, ...conceptRecords, ...sectionRecords, ...objectiveRecords];
  });
}

function normalise(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function searchRecords(records: SearchRecord[], query: string, limit = 8) {
  const tokens = normalise(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return records
    .map((record) => {
      const title = normalise(record.title);
      const keywords = normalise(`${record.keywords} ${record.excerpt}`);
      let score = 0;

      for (const token of tokens) {
        if (title.startsWith(token)) score += 6;
        else if (title.includes(token)) score += 4;
        else if (keywords.includes(token)) score += 1;
        else return null;
      }

      return { record, score: score + TYPE_WEIGHT[record.type] };
    })
    .filter((hit): hit is { record: SearchRecord; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score || a.record.lectureNumber - b.record.lectureNumber)
    .slice(0, limit)
    .map((hit) => hit.record);
}
