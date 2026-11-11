export type { ExpectedTopic } from "@site/content/schema";

export function expectedKey(topicId: string, itemId: string): string {
  return `${topicId}/${itemId}`;
}
