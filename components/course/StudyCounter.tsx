"use client";

import { useEffect } from "react";
import { STUDY_EVENT, type StudyEventType } from "@site/lib/studyEvents";
import { sendMetric } from "@/lib/metrics-client";

/** Counts that a course was opened and each study action the course page announces. Renders nothing. */
export function StudyCounter({ courseKey }: { courseKey: string }) {
  useEffect(() => {
    sendMetric("course_open", courseKey);
    const onStudy = (event: Event) => {
      const type = (event as CustomEvent<{ type?: StudyEventType }>).detail?.type;
      if (type === "quiz_completed" || type === "review_completed" || type === "exam_completed") sendMetric(type, courseKey);
    };
    window.addEventListener(STUDY_EVENT, onStudy);
    return () => window.removeEventListener(STUDY_EVENT, onStudy);
  }, [courseKey]);
  return null;
}
