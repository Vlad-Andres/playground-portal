import type { Concept } from "@site/content/types";
import { Badge } from "@site/components/ui/Badge";
import { Card } from "@site/components/ui/Card";
import { Markdown } from "@site/components/content/Markdown";

interface ConceptCardProps {
  concept: Concept;
}

export function ConceptCard({ concept }: ConceptCardProps) {
  return (
    <Card
      as="article"
      id={`concept-${concept.id}`}
      className="scroll-mt-24 grid content-start gap-3 p-5"
    >
      <div className="grid gap-1.5">
        <h3 className="text-base font-semibold text-ink">{concept.term}</h3>
        <p className="text-sm text-muted">{concept.short}</p>
      </div>

      {concept.detail ? <Markdown className="text-sm">{concept.detail}</Markdown> : null}

      {concept.tags?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {concept.tags.map((tag) => (
            <Badge key={tag} tone="brand">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
