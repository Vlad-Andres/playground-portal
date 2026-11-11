import type { ReactNode } from "react";
// The template's styles load only under /courses/*, so the portal's own pages keep their look.
import "katex/dist/katex.min.css";
import "@site/site.css";

export default function CourseLayout({ children }: { children: ReactNode }) {
  return children;
}
