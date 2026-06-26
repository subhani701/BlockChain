/**
 * MerkleTreeView — renders every level of the tree (root on top, leaves on the
 * bottom). Optionally highlights the leaf, the nodes on the proof path, and the
 * sibling nodes used by a proof.
 */
import type { MerkleLevel } from "../api/client";
import { shortHash } from "../api/client";

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
    <div className="tree">
      {levels.map((lvl) => (
        <div className="tree-level" key={lvl.level}>
          <div className="tree-level-label">
            {lvl.level === 0
              ? `Leaves (${lvl.nodes.length})`
              : lvl.level === maxLevel
              ? "Merkle Root"
              : `Level ${lvl.level} — parents (${lvl.nodes.length})`}
          </div>
          <div className="tree-nodes">
            {lvl.nodes.map((n, i) => {
              const cls = ["node"];
              if (lvl.level === maxLevel) cls.push("root");
              else if (lvl.level === 0) cls.push("leaf");
              if (leaf && n === leaf) cls.push("on-path");
              else if (pathNodes?.has(n)) cls.push("on-path");
              if (siblingNodes?.has(n)) cls.push("sibling");
              return (
                <span className={cls.join(" ")} key={i} title={n}>
                  {shortHash(n, 6, 4)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
