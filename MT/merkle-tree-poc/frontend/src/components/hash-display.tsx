import { shortHash } from "@/api/client";
import { CopyButton } from "@/components/copy-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Monospace, shortened hash with a full-value tooltip + copy button. */
export function HashDisplay({
  value,
  lead = 10,
  tail = 8,
  className,
  copyable = true
}: {
  value: string | null | undefined;
  lead?: number;
  tail?: number;
  className?: string;
  copyable?: boolean;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <code className="hash-mono text-xs text-primary">
            {shortHash(value, lead, tail)}
          </code>
        </TooltipTrigger>
        <TooltipContent className="max-w-[92vw]">
          <span className="hash-mono">{value}</span>
        </TooltipContent>
      </Tooltip>
      {copyable && <CopyButton value={value} />}
    </span>
  );
}
