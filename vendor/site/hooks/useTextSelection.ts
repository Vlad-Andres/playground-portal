"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssistantSelection } from "@site/lib/assistant/prompt";

const MAX_SELECTION_LENGTH = 6000;

export interface SelectionAnchor {
  selection: AssistantSelection;
  top: number;
  bottom: number;
  centerX: number;
}

export function useTextSelection(scopeSelector: string, sectionTitles: Record<string, string>) {
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);

  useEffect(() => {
    let frame = 0;
    let pointerDown = false;

    const measure = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container instanceof Element ? container : container.parentElement;
      const scope = document.querySelector(scopeSelector);
      if (!element || !scope?.contains(element)) return null;
      if (element.closest("input, textarea, [contenteditable='true'], [data-assistant-ignore]")) return null;

      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (text.length < 3) return null;

      const rect = range.getBoundingClientRect();
      const sectionId = element.closest("section[id]")?.id;

      return {
        selection: {
          text: text.slice(0, MAX_SELECTION_LENGTH),
          sectionTitle: sectionId ? sectionTitles[sectionId] : undefined,
          truncated: text.length > MAX_SELECTION_LENGTH,
        },
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
      };
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!pointerDown) setAnchor(measure());
      });
    };
    const onPointerDown = () => {
      pointerDown = true;
    };
    const onPointerUp = () => {
      pointerDown = false;
      update();
    };

    document.addEventListener("selectionchange", update);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scopeSelector, sectionTitles]);

  const clear = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setAnchor(null);
  }, []);

  return { anchor, clear };
}
