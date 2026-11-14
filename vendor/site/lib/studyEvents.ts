/**
 * Course pages announce finished study actions as a browser event. A host (the portal) may listen and
 * count them; the template itself never sends anything anywhere. Only the type is included.
 */
export const STUDY_EVENT = "study-event";

export type StudyEventType = "quiz_completed" | "review_completed" | "exam_completed";

export function announceStudyEvent(type: StudyEventType): void {
  if (typeof window === "undefined" || !window) return;
  window.dispatchEvent(new CustomEvent(STUDY_EVENT, { detail: { type } }));
}
