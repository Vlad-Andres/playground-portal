"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { removeCourse, saveCourse } from "@/app/manage/[token]/actions";
import styles from "@/app/manage/manage.module.css";
import type { EditorModel } from "@/lib/sites/editor-model";
import type { CoursePatch } from "@/lib/sites/edit";

type BlockState = { remove: boolean; md: string };

const blockId = (slug: string, sectionId: string, index: number) => `${slug}|${sectionId}|${index}`;

export function Editor({ token, model }: { token: string; model: EditorModel }) {
  const t = useTranslations("manage");
  const router = useRouter();
  const [title, setTitle] = useState(model.title);
  const [description, setDescription] = useState(model.description);
  const [accent, setAccent] = useState(model.accent);
  const [lectures, setLectures] = useState(() => Object.fromEntries(model.lectures.map((lecture) => [lecture.slug, { title: lecture.title, remove: false }])));
  const [blocks, setBlocks] = useState<Record<string, BlockState>>(() =>
    Object.fromEntries(
      model.lectures.flatMap((lecture) =>
        lecture.sections.flatMap((section) => section.blocks.map((block) => [blockId(lecture.slug, section.id, block.index), { remove: false, md: block.md ?? "" }] as const)),
      ),
    ),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const errorText = (code: string) => (t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.bad-request"));

  /** Only what changed. */
  function buildPatch(): CoursePatch {
    const patch: CoursePatch = {};
    if (title.trim() !== model.title) patch.title = title.trim();
    if (description !== model.description) patch.description = description;
    if (accent.toLowerCase() !== model.accent.toLowerCase()) patch.accent = accent;
    const lecturePatches: NonNullable<CoursePatch["lectures"]> = [];
    const blockPatches: NonNullable<CoursePatch["blocks"]> = [];
    for (const lecture of model.lectures) {
      const state = lectures[lecture.slug];
      if (state.remove) {
        lecturePatches.push({ slug: lecture.slug, remove: true });
        continue; // its blocks go with it
      }
      if (state.title.trim() !== lecture.title) lecturePatches.push({ slug: lecture.slug, title: state.title.trim() });
      for (const section of lecture.sections) {
        for (const block of section.blocks) {
          const edit = blocks[blockId(lecture.slug, section.id, block.index)];
          if (edit.remove) blockPatches.push({ slug: lecture.slug, sectionId: section.id, index: block.index, remove: true });
          else if (block.editable && edit.md !== (block.md ?? "")) blockPatches.push({ slug: lecture.slug, sectionId: section.id, index: block.index, md: edit.md });
        }
      }
    }
    if (lecturePatches.length) patch.lectures = lecturePatches;
    if (blockPatches.length) patch.blocks = blockPatches;
    return patch;
  }

  async function save() {
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      setMessage({ ok: true, text: t("nothingChanged") });
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await saveCourse(token, patch);
      if (result.ok) {
        setMessage({ ok: true, text: t("saved") });
        router.refresh();
      } else {
        setMessage({ ok: false, text: errorText(result.code) });
      }
    } catch {
      setMessage({ ok: false, text: t("errors.bad-request") });
    }
    setPending(false);
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    const result = await removeCourse(token);
    if (result.ok) window.location.assign("/");
    else setMessage({ ok: false, text: errorText("not-found") });
  }

  return (
    <>
      <section className={styles.card}>
        <label className={styles.field}>
          {t("siteTitle")}
          <input type="text" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className={styles.field}>
          {t("description")}
          <textarea value={description} maxLength={400} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className={styles.field}>
          {t("accent")}
          <input className={styles.color} type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
      </section>

      <h2 className={styles.heading}>{t("lecturesTitle")}</h2>
      {model.lectures.map((lecture) => {
        const state = lectures[lecture.slug];
        return (
          <details key={lecture.slug} className={`${styles.lecture} ${state.remove ? styles.removed : ""}`}>
            <summary>{state.title || lecture.title}</summary>
            <div className={styles.lectureBody}>
              <label className={styles.field}>
                {t("lectureTitle")}
                <input type="text" value={state.title} maxLength={120} onChange={(event) => setLectures((current) => ({ ...current, [lecture.slug]: { ...state, title: event.target.value } }))} />
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={state.remove} onChange={(event) => setLectures((current) => ({ ...current, [lecture.slug]: { ...state, remove: event.target.checked } }))} />
                {t("removeLecture")}
              </label>
              {lecture.sections.map((section) => (
                <div key={section.id} style={{ display: "grid", gap: 10 }}>
                  <p className={styles.sectionTitle}>{section.title}</p>
                  {section.blocks.map((block) => {
                    const id = blockId(lecture.slug, section.id, block.index);
                    const edit = blocks[id];
                    return (
                      <div key={id} className={`${styles.block} ${edit.remove ? styles.removed : ""}`}>
                        <div className={styles.blockHead}>
                          <span className={styles.kind}>{t.has(`kinds.${block.kind}`) ? t(`kinds.${block.kind}`) : block.kind}</span>
                          <label className={styles.check}>
                            <input type="checkbox" checked={edit.remove} onChange={(event) => setBlocks((current) => ({ ...current, [id]: { ...edit, remove: event.target.checked } }))} />
                            {t("removeBlock")}
                          </label>
                        </div>
                        {block.editable ? (
                          <textarea
                            className={styles.blockText}
                            aria-label={t("markdown")}
                            value={edit.md}
                            maxLength={6000}
                            disabled={edit.remove}
                            onChange={(event) => setBlocks((current) => ({ ...current, [id]: { ...edit, md: event.target.value } }))}
                          />
                        ) : (
                          <p className={styles.summary}>{block.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        );
      })}

      <div className={styles.bar}>
        <button type="button" className={styles.primary} onClick={save} disabled={pending}>{t("save")}</button>
        <a className={styles.link} href={`/courses/${model.key}/`} target="_blank" rel="noreferrer">{t("openSite")}</a>
        {message ? <span className={message.ok ? styles.ok : styles.error} role="status">{message.text}</span> : null}
      </div>

      <section className={styles.danger}>
        <h2>{t("deleteTitle")}</h2>
        <p>{t("deleteText")}</p>
        <button type="button" className={styles.dangerButton} onClick={remove}>{t("deleteButton")}</button>
      </section>
    </>
  );
}
