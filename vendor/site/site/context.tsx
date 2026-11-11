"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteData } from "@core/site";
import { makeStorageKey } from "@site/lib/storageKey";
import { sitePaths, type SitePaths } from "@site/site/paths";

export interface SiteContextValue {
  data: SiteData;
  paths: SitePaths;
  storageKey(name: string): string;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  data,
  base,
  children,
}: {
  data: SiteData;
  base: string;
  children: ReactNode;
}) {
  const value = useMemo<SiteContextValue>(
    () => ({
      data,
      paths: sitePaths(base),
      storageKey: makeStorageKey(data.key),
    }),
    [data, base],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used inside a SiteProvider.");
  return value;
}
