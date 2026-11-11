export type ResolvedTheme = "light" | "dark";

/** Storage key for the theme; must match the key `useTheme` reads. */
export function themeStorageKey(siteKey: string): string {
  return `${siteKey}:theme`;
}

/** Runs before React so the page never flashes the wrong theme. */
export function themeBootstrapScript(siteKey: string): string {
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(themeStorageKey(siteKey))});var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
}
