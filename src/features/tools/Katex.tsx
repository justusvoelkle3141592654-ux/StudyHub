import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Render a LaTeX string with KaTeX (errors are shown in red instead of throwing). */
export function Katex({ latex, display = true, className }: { latex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => katex.renderToString(latex, { displayMode: display, throwOnError: false, output: "html" }), [latex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
