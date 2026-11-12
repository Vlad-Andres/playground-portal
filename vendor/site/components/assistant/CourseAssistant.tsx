"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@site/components/assistant/ChatPanel";
import { SelectionPill } from "@site/components/assistant/SelectionPill";
import { useAssistantChat } from "@site/hooks/useAssistantChat";
import { useTextSelection } from "@site/hooks/useTextSelection";
import type { AssistantSelection } from "@site/lib/assistant/prompt";
import { useSite } from "@site/site/context";

interface CourseAssistantProps {
  context: string;
}

export function CourseAssistant({ context }: CourseAssistantProps) {
  const { data } = useSite();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AssistantSelection>();
  const chat = useAssistantChat("course", context);
  const sectionTitles = useMemo(
    () =>
      Object.fromEntries(
        data.lectures.flatMap((lecture) => lecture.sections.map((section) => [section.id, section.title])),
      ),
    [data.lectures],
  );
  const { anchor, clear } = useTextSelection("[data-assistant-scope]", sectionTitles);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {anchor ? (
        <SelectionPill
          anchor={anchor}
          onAsk={() => {
            setPending(anchor.selection);
            setOpen(true);
            clear();
          }}
        />
      ) : null}

      {open ? (
        <ChatPanel
          courseLabel={data.course.title}
          turns={chat.turns}
          busy={chat.busy}
          pending={pending}
          onClearPending={() => setPending(undefined)}
          onSend={(question) => {
            void chat.send(question, pending);
            setPending(undefined);
          }}
          onStop={chat.stop}
          onReset={chat.reset}
          onClose={close}
        />
      ) : (
        <button
          type="button"
          data-assistant-ignore
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink shadow-[var(--shadow-card)] transition-opacity hover:opacity-90"
        >
          <Sparkles size={16} aria-hidden />
          Ask AI
        </button>
      )}
    </>
  );
}
