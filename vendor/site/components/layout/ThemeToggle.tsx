"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@site/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-brand/40 hover:text-brand"
    >
      {mounted && theme === "dark" ? (
        <Sun size={17} aria-hidden />
      ) : (
        <Moon size={17} aria-hidden />
      )}
    </button>
  );
}
