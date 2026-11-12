import type { ReactNode } from "react";
import { LanguageSwitch } from "./LanguageSwitch";

/** The brand, the language switch and an optional note or action; shared by every portal page. */
export function TopBar({ note, children }: { note?: string; children?: ReactNode }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">✦</span>
        <span>playground<span className="brand-dot">.</span></span>
      </a>
      <div className="topbar-right">
        {note ? <span className="topbar-note">{note}</span> : null}
        <LanguageSwitch />
        {children}
      </div>
    </header>
  );
}
