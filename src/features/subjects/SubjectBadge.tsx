import type { Subject } from "@/data/types";
import { cn } from "@/lib/utils";

export function SubjectDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

export function SubjectBadge({ subject, className }: { subject: Subject | null | undefined; className?: string }) {
  if (!subject) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <SubjectDot color={subject.color} />
      {subject.name}
    </span>
  );
}
