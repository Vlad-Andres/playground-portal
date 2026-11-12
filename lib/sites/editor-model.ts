import type { SiteData } from "@core/site";
import { blockSummary } from "./edit";

export interface EditorBlock {
  index: number;
  kind: string;
  text: string;
  editable: boolean;
  /** The Markdown of an editable block. */
  md?: string;
}

export interface EditorModel {
  key: string;
  title: string;
  description: string;
  accent: string;
  lectures: { slug: string; title: string; sections: { id: string; title: string; blocks: EditorBlock[] }[] }[];
}

export const DEFAULT_ACCENT = "#237b55";

/** What the editor needs, as plain data: the page never sends a whole course to the browser. */
export function editorModel(site: SiteData): EditorModel {
  return {
    key: site.key,
    title: site.course.title,
    description: site.course.description,
    accent: site.course.theme?.accent ?? DEFAULT_ACCENT,
    lectures: site.lectures.map((lecture) => ({
      slug: lecture.meta.slug,
      title: lecture.meta.title,
      sections: lecture.sections.map((section) => ({
        id: section.id,
        title: section.title,
        blocks: section.blocks.map((block, index) => {
          const summary = blockSummary(block);
          return { index, kind: summary.kind, text: summary.text, editable: summary.editable, ...(summary.editable && "md" in block ? { md: block.md } : {}) };
        }),
      })),
    })),
  };
}
