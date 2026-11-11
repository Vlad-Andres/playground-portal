import type { Block, Concept } from "@site/content/types";
import { CodeBlock } from "@site/components/content/CodeBlock";
import { ConceptCard } from "@site/components/content/ConceptCard";
import { DataTable } from "@site/components/content/DataTable";
import { ExerciseSheetView } from "@site/components/content/ExerciseSheetView";
import { FigureImage } from "@site/components/content/FigureImage";
import { Formula } from "@site/components/content/Formula";
import { HighlightList } from "@site/components/content/HighlightList";
import { InfoBox } from "@site/components/content/InfoBox";
import { InteractivePanel } from "@site/components/content/InteractivePanel";
import { Markdown } from "@site/components/content/Markdown";
import { MemoryCards } from "@site/components/content/MemoryCards";
import { PracticeSet } from "@site/components/content/PracticeSet";
import { Timeline } from "@site/components/content/Timeline";
import { WorkedExample } from "@site/components/content/WorkedExample";
import { WidgetHost } from "@site/widgets/WidgetHost";
import { CustomFrame } from "@site/components/content/CustomFrame";
import { sourceLabel } from "@site/lib/course-info";

interface BlockRendererProps {
  block: Block;
  concepts: Concept[];
}

export function BlockRenderer({ block, concepts }: BlockRendererProps) {
  if (!block.source) return <BlockContent block={block} concepts={concepts} />;
  return (
    <div className="grid gap-1.5">
      <BlockContent block={block} concepts={concepts} />
      <p className="w-fit rounded-md bg-sunken px-2 py-0.5 text-xs text-faint">{sourceLabel(block.source)}</p>
    </div>
  );
}

function BlockContent({ block, concepts }: BlockRendererProps) {
  switch (block.kind) {
    case "prose":
      return <Markdown>{block.md}</Markdown>;

    case "info":
      return (
        <InfoBox variant={block.variant} title={block.title}>
          {block.md}
        </InfoBox>
      );

    case "concepts": {
      const selected = block.ids
        .map((id) => concepts.find((concept) => concept.id === id))
        .filter((concept): concept is Concept => Boolean(concept));

      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {selected.map((concept) => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}
        </div>
      );
    }

    case "formula":
      return <Formula tex={block.tex} caption={block.caption} />;

    case "code":
      return <CodeBlock code={block.code} lang={block.lang} caption={block.caption} run={block.run} />;

    case "table":
      return <DataTable headers={block.headers} rows={block.rows} caption={block.caption} />;

    case "figure":
      return (
        <FigureImage src={block.src} alt={block.alt} width={block.width} height={block.height} caption={block.caption} />
      );

    case "steps":
      return <WorkedExample title={block.title} intro={block.intro} steps={block.steps} />;

    case "timeline":
      return <Timeline items={block.items} />;

    case "list":
      return <HighlightList variant={block.variant} items={block.items} />;

    case "exercises":
      return <ExerciseSheetView sheet={block.sheet} />;

    case "recall":
      return <MemoryCards cards={block.cards} />;

    case "practice":
      return <PracticeSet id={block.id} tasks={block.tasks} />;

    case "widget":
      return <WidgetHost type={block.type} title={block.title} description={block.description} props={block.props} />;

    case "custom":
      return (
        <CustomFrame
          title={block.title}
          description={block.description}
          html={block.html}
          height={block.height}
        />
      );
  }
}
