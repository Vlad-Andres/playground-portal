"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { daysUntil } from "@site/lib/course-info";

/** "N days to the exam" — computed in the browser so a static build never goes stale. */
export function ExamCountdown({ examDate }: { examDate?: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the date is only known in the browser
    setDays(daysUntil(examDate, new Date()));
  }, [examDate]);
  if (days === null) return null;
  return (
    <p className="flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand-soft/40 px-3 py-1 text-sm font-medium text-ink">
      <CalendarClock size={15} className="text-brand" aria-hidden />
      {days === 0 ? "The exam is today" : `${days} ${days === 1 ? "day" : "days"} to the exam`}
    </p>
  );
}
