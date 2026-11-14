/** Events a page may count; the server accepts no others (see lib/metrics.ts). */
export type ClientMetric = "course_open" | "demo_open" | "quiz_completed" | "review_completed" | "exam_completed" | "share_copied";

/** Best-effort count of one event for one course: only the type and the course key are sent. */
export function sendMetric(type: ClientMetric, courseKey: string): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  // text/plain keeps the beacon a simple request (no preflight).
  navigator.sendBeacon("/api/metrics", new Blob([JSON.stringify({ type, courseKey })], { type: "text/plain" }));
}
