import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { RunnableCode } from "@site/components/content/RunnableCode";
import { cn } from "@site/lib/cn";
import { runLanguage } from "@site/lib/runner/types";

/** `//host` and `/\host` are protocol-relative: the browser resolves them to another origin. */
function isProtocolRelative(value: string): boolean {
  return value.startsWith("//") || value.startsWith("/\\") || value.startsWith("\\");
}

function safeHref(href: string | undefined): string | undefined {
  if (!href || isProtocolRelative(href)) return undefined;
  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return undefined;
}

/** Content images may only point at files shipped with the site, never a third-party URL. */
function safeImageSrc(src: string | undefined): string | undefined {
  if (!src || isProtocolRelative(src)) return undefined;
  if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) return src;
  return undefined;
}

const components: Components = {
  p: ({ children }) => <p className="leading-relaxed text-muted">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => {
    const safe = safeHref(href);
    if (!safe) return <>{children}</>;
    const external = /^https?:\/\//i.test(safe);
    return (
      <a
        href={safe}
        className="font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    const safe = typeof src === "string" ? safeImageSrc(src) : undefined;
    // Never let content trigger a third-party image request; keep the alt text as plain text.
    if (!safe) return alt ? <span className="text-faint">{alt}</span> : null;
    // eslint-disable-next-line @next/next/no-img-element -- content images are local files and have no known dimensions
    return <img src={safe} alt={alt ?? ""} loading="lazy" className="max-w-full rounded-lg border border-line" />;
  },
  ul: ({ children }) => (
    <ul className="ml-1 grid gap-1.5 text-muted [&>li]:relative [&>li]:pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="ml-5 grid list-decimal gap-1.5 text-muted marker:text-faint">{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li
      {...props}
      className="leading-relaxed before:absolute before:left-1 before:top-[0.65em] before:hidden before:h-1 before:w-1 before:rounded-full before:bg-brand/60 [ul>&]:before:block"
    >
      {children}
    </li>
  ),
  h3: ({ children }) => <h3 className="text-base font-semibold text-ink">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-ink">{children}</h4>,
  code: ({ children, className }) => (
    <code
      className={cn(
        "rounded-md border border-line bg-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-ink",
        className,
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children, node }) => {
    // Fenced ```sql / ```cypher blocks become runnable against the sample data.
    const codeNode = node?.children[0];
    if (codeNode?.type === "element" && codeNode.tagName === "code") {
      const classes = codeNode.properties.className;
      const lang = (Array.isArray(classes) ? classes : []).map(String).find((name) => name.startsWith("language-"))?.slice(9);
      const engine = lang ? runLanguage(lang) : null;
      const text = codeNode.children.map((child) => (child.type === "text" ? child.value : "")).join("");
      if (engine && text.trim()) return <RunnableCode lang={engine} code={text} />;
    }
    return (
      <pre className="overflow-x-auto rounded-xl border border-line bg-sunken p-4 font-mono text-sm [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0">
        {children}
      </pre>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand/40 pl-4 text-muted italic">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line px-3 py-2 text-left font-semibold text-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-3 py-2 align-top text-muted">{children}</td>
  ),
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("grid gap-3 text-[0.95rem]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
