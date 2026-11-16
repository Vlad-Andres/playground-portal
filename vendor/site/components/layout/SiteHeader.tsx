"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { siteFeatures } from "@core/site";
import { StudyText } from "@site/components/content/Markdown";
import { SearchDialog } from "@site/components/layout/SearchDialog";
import { ThemeToggle } from "@site/components/layout/ThemeToggle";
import type { SearchRecord } from "@site/lib/search";
import { useSite } from "@site/site/context";

export function CourseWorkspace({ records, children }: { records: SearchRecord[]; children: ReactNode }) {
  const { data, host, paths } = useSite();
  const { course, lectures } = data;
  const { search, difficult } = siteFeatures(course);
  const pathname = usePathname();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuId = useId();
  const currentPath = pathname ?? paths.home;
  const menuOpen = menuFor === currentPath;
  const matches = (href: string) => pathname?.replace(/\/$/, "") === href.replace(/\/$/, "");
  const current = lectures.find(({ meta }) => matches(paths.lecture(meta.slug)));
  const studyLectures = current ? [current, ...lectures.filter((lecture) => lecture !== current)] : lectures;
  const recallLecture = studyLectures.find((lecture) => lecture.sections.some((section) => section.blocks.some((block) => block.kind === "recall")));
  const recallSection = recallLecture?.sections.find((section) => section.blocks.some((block) => block.kind === "recall"));
  const quizLecture = studyLectures.find((lecture) => lecture.quiz.length && lecture.sections.some((section) => section.kind === "quiz"));
  const quizSection = quizLecture?.sections.find((section) => section.kind === "quiz");
  const navClick = () => setMenuFor(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuFor(null);
      if (search && event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setMenuFor(null);
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [search]);

  return (
    <div className="course-workspace" data-menu-open={menuOpen}>
      <header className="course-workspace-masthead">
        {host.brand.name === "Study with AI" && host.brand.homeUrl ? (
          <a href={host.brand.homeUrl} className="course-workspace-wordmark">
            study <span>/</span> with ai
          </a>
        ) : (
          <Link href={paths.home} onClick={navClick} className="course-workspace-wordmark">{host.brand.name}</Link>
        )}
        <div className="course-workspace-actions">
          {search ? (
            <button type="button" onClick={() => { navClick(); setSearchOpen(true); }} aria-label="Search course">
              <Search size={17} aria-hidden />
              <span className="hidden sm:inline">Search</span>
            </button>
          ) : null}
          <ThemeToggle />
          <button type="button" className="course-workspace-menu-toggle" aria-label={menuOpen ? "Close course menu" : "Open course menu"}
            aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuFor(menuOpen ? null : currentPath)}>
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </header>

      <div className="course-workspace-body">
        <nav id={menuId} className="course-workspace-rail" aria-label="Course navigation">
          <p className="course-workspace-label">Your course</p>
          <Link href={paths.home} className="course-workspace-title" onClick={navClick} aria-current={matches(paths.home) ? "page" : undefined}>
            <StudyText>{course.title}</StudyText>
          </Link>
          <p className="course-workspace-label course-workspace-lecture-label">Lectures</p>
          <ol className="course-workspace-lectures">
            {lectures.map(({ meta }) => {
              const href = paths.lecture(meta.slug);
              return (
                <li key={meta.slug}>
                  <Link href={href} onClick={navClick} aria-current={matches(href) ? "page" : undefined}>
                    <span className="shrink-0 tabular-nums">{String(meta.number).padStart(2, "0")}</span>
                    <span className="min-w-0"><StudyText>{meta.title}</StudyText></span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="course-workspace-study">
            {recallLecture && recallSection ? <Link onClick={navClick} href={`${paths.lecture(recallLecture.meta.slug)}#${recallSection.id}`}>Recall cards</Link> : null}
            {quizLecture && quizSection ? <Link onClick={navClick} href={`${paths.lecture(quizLecture.meta.slug)}#${quizSection.id}`}>Quiz practice</Link> : null}
            {data.exam ? <Link href={paths.exam} onClick={navClick} aria-current={matches(paths.exam) ? "page" : undefined}>Practice exam</Link> : null}
            {data.expected.length > 0 ? <Link href={paths.expected} onClick={navClick} aria-current={matches(paths.expected) ? "page" : undefined}>Expected at the exam</Link> : null}
            {difficult ? <Link href={paths.difficult} onClick={navClick} aria-current={matches(paths.difficult) ? "page" : undefined}>Difficult parts</Link> : null}
          </div>
          {host.brand.homeUrl ? <a href={host.brand.homeUrl} className="course-workspace-back">← Study with AI</a> : null}
        </nav>
        <main id="main" className="course-workspace-content" data-assistant-scope>{children}</main>
      </div>
      {search && searchOpen ? <SearchDialog records={records} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
