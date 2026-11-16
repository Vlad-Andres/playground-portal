import { InlineMarkdown, StudyText } from "@site/components/content/Markdown";

interface DataTableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function DataTable({ headers, rows, caption }: DataTableProps) {
  return (
    <figure className="grid gap-2">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-sunken">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap text-ink"
                >
                  <InlineMarkdown>{header}</InlineMarkdown>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-line">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 align-top text-muted">
                    <InlineMarkdown>{cell}</InlineMarkdown>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? <figcaption className="text-xs text-faint"><StudyText>{caption}</StudyText></figcaption> : null}
    </figure>
  );
}
