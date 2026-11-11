"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { ExpectedBoard } from "@site/components/expected/ExpectedBoard";

export function ExpectedScreen({ data }: { data: SiteData }) {
  if (data.expected.length === 0) notFound();
  return <ExpectedBoard />;
}
