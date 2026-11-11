import katex from "katex";

interface FormulaProps {
  tex: string;
  caption?: string;
}

export function Formula({ tex, caption }: FormulaProps) {
  const html = katex.renderToString(tex, { displayMode: true, throwOnError: false });

  return (
    <figure className="grid justify-items-center gap-2 rounded-xl border border-line bg-sunken px-4 py-5">
      <div className="w-full overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />
      {caption ? <figcaption className="text-center text-xs text-faint">{caption}</figcaption> : null}
    </figure>
  );
}
