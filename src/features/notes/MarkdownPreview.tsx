import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Rendered Markdown (GitHub-flavoured: tables, task lists, strikethrough). */
export function MarkdownPreview({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn("markdown-body text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          input: ({ checked }) => <input type="checkbox" checked={!!checked} readOnly className="mr-1 align-middle" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
