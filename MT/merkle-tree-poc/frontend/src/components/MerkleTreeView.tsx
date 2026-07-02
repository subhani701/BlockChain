/**
 * MerkleTreeView — renders every level of the tree (root on top, leaves on the
 * bottom). Optionally highlights the leaf, the nodes on the proof path, and the
 * sibling nodes used by a proof.
 */
import type { MerkleLevel } from "@/api/client";
import { shortHash } from "@/api/client";
import { cn } from "@/lib/utils";

interface Props {
  levels: MerkleLevel[];
  /** Hashes to mark as the verification path (running hashes). */
  pathNodes?: Set<string>;
  /** Hashes to mark as proof siblings. */
  siblingNodes?: Set<string>;
  /** The selected leaf hash. */
  leaf?: string;
}

export function MerkleTreeView({
  levels,
  pathNodes,
  siblingNodes,
  leaf
}: Props) {
  const maxLevel = levels.length - 1;

  return (
    <div className="flex flex-col-reverse gap-4">
      {levels.map((lvl) => {
        const isRootLevel = lvl.level === maxLevel;
        const isLeafLevel = lvl.level === 0;
        return (
          <div key={lvl.level} className="flex flex-col items-center gap-1.5">
            <div className="text-xs text-muted-foreground">
              {isLeafLevel
                ? `Leaves (${lvl.nodes.length})`
                : isRootLevel
                  ? "Merkle Root"
                  : `Level ${lvl.level} — parents (${lvl.nodes.length})`}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {lvl.nodes.map((n, i) => {
                const onPath = (leaf && n === leaf) || pathNodes?.has(n);
                const sibling = siblingNodes?.has(n);
                return (
                  <span
                    key={i}
                    title={n}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                      isRootLevel
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : isLeafLevel
                          ? "border-indigo-400/60 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground",
                      onPath && "border-success text-success ring-1 ring-success",
                      sibling &&
                        "border-warning text-warning ring-1 ring-warning"
                    )}
                  >
                    {shortHash(n, 6, 4)}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
