"use client";

import { StudyText } from "@site/components/content/Markdown";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { acceptSandboxMessage, clampHeight, wrapCustomHtml } from "@core/sandbox";

interface CustomFrameProps {
  title: string;
  description: string;
  html: string;
  height?: number;
  scriptOrigins?: string[];
}

function sendTheme(frame: HTMLIFrameElement | null) {
  const value = document.documentElement.classList.contains("dark") ? "dark" : "light";
  frame?.contentWindow?.postMessage({ pg: "theme", value }, "*");
}

/** A custom component from the course, isolated in a frame that cannot touch the page. */
export function CustomFrame({ title, description, html, height, scriptOrigins }: CustomFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = useState(() => clampHeight(height ?? 360));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const srcDoc = useMemo(
    () => wrapCustomHtml(html, { scriptOrigins }),
    [html, scriptOrigins],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = acceptSandboxMessage(
        event.source,
        frameRef.current?.contentWindow ?? null,
        event.data,
      );
      if (!message) return;
      if (message.pg === "height") setFrameHeight(clampHeight(message.value));
      else if (message.pg === "error") setError(message.message);
      else if (message.pg === "done") setDone(true);
    };

    const themeObserver = new MutationObserver(() => sendTheme(frameRef.current));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    sendTheme(frameRef.current);
    window.addEventListener("message", onMessage);
    return () => {
      themeObserver.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-line bg-surface p-2.5 sm:p-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-ink"><StudyText>{title}</StudyText></h3>
        <p className="text-sm text-muted"><StudyText>{description}</StudyText></p>
      </div>

      <iframe
        ref={frameRef}
        title={title}
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        onLoad={(event) => sendTheme(event.currentTarget)}
        referrerPolicy="no-referrer"
        className="block w-full min-w-0 rounded-xl border border-line bg-surface"
        style={{ height: frameHeight }}
      />

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/35 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">This exercise hit an error.</span> {error}
          </span>
        </p>
      ) : null}

      {done ? (
        <p className="flex items-center gap-2 text-sm font-medium text-positive">
          <CheckCircle2 size={16} aria-hidden />
          Done
        </p>
      ) : null}
    </section>
  );
}
