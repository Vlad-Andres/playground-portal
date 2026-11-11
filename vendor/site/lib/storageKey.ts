/** Namespace every stored value by the site key, so two courses never share progress. */
export function makeStorageKey(siteKey: string): (name: string) => string {
  return (name) => `${siteKey}:${name}`;
}
