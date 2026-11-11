import { codeToHtml } from "shiki";
import { RunnableCode } from "@site/components/content/RunnableCode";
import type { RunConfig } from "@site/content/types";
import { runLanguage } from "@site/lib/runner/types";

interface CodeBlockProps {
  code: string;
  lang: string;
  caption?: string;
  run?: RunConfig | false;
}

export async function CodeBlock({ code, lang, caption, run }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  const engine = run === false ? null : runLanguage(lang);
  if (engine) {
    const config = run || {};
    return (
      <RunnableCode
        lang={engine}
        code={code}
        runCode={config.code}
        note={config.note}
        hint={config.hint}
        html={html}
        caption={caption}
      />
    );
  }

  return (
    <figure className="grid gap-2">
      <div
        className="overflow-x-auto rounded-xl border border-line bg-sunken p-4 text-sm [&_pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {caption ? <figcaption className="text-xs text-faint">{caption}</figcaption> : null}
    </figure>
  );
}
