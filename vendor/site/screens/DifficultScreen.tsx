"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { siteFeatures } from "@core/site";
import { DifficultHub } from "@site/components/difficult/DifficultHub";

export function DifficultScreen({ data }: { data: SiteData }) {
  if (!siteFeatures(data.course).difficult) notFound();
  return <DifficultHub />;
}
