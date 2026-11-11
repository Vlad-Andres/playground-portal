import { PencilRuler } from "lucide-react";
import type { ExerciseTask } from "@site/content/types";
import { ExerciseAnswer } from "@site/components/content/ExerciseAnswer";
import { Card } from "@site/components/ui/Card";

export function PracticeSet({ id, tasks }: { id: string; tasks: ExerciseTask[] }) {
  return (
    <Card className="grid gap-4 p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <PencilRuler size={16} className="text-brand" aria-hidden />
        Practice
      </h3>
      <ol className="grid gap-4">
        {tasks.map((task, index) => (
          <ExerciseAnswer key={task.id} sheetId={id} task={task} index={index} />
        ))}
      </ol>
    </Card>
  );
}
