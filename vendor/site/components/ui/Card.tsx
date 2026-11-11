import type { ReactNode } from "react";
import { cn } from "@site/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "div" | "article" | "section" | "li";
}

export function Card({ children, className, id, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
