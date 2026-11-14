"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_HOST, type SiteData, type SiteHost } from "@core/site";
import { makeStorageKey } from "@site/lib/storageKey";
import { sitePaths, type SitePaths } from "@site/site/paths";

export interface SiteContextValue {
  data: SiteData;
  host: SiteHost;
  paths: SitePaths;
  storageKey(name: string): string;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  data,
  base,
  host = DEFAULT_HOST,
  children,
}: {
  data: SiteData;
  base: string;
  host?: SiteHost;
  children: ReactNode;
}) {
  const value = useMemo<SiteContextValue>(
    () => ({
      data,
      host,
      paths: sitePaths(base),
      storageKey: makeStorageKey(data.key),
    }),
    [data, base, host],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used inside a SiteProvider.");
  return value;
}
