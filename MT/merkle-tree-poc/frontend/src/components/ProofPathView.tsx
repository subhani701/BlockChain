/**
 * ProofPathView — visualizes how a leaf climbs to the root by hashing against
 * each sibling in the proof. Shows every sibling, its side (left/right), and
 * explains WHY each sibling is needed.
 */
import { ArrowDown, Flag } from "lucide-react";
import type { ProofResponse } from "@/api/client";
import { HashDisplay } from "@/components/hash-display";
import { Badge } from "@/components/ui/badge";

function StepRow({
  marker,
  title,
  hint,
  hash,
  side
}: {
  marker: React.ReactNode;
  title: string;
  hint?: string;
  hash: string;
  side?: "left" | "right";
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {marker}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          {side && (
            <Badge variant={side === "left" ? "secondary" : "warning"}>
              {side}
            </Badge>
          )}
        </div>
        <div className="mt-0.5">
          <HashDisplay value={hash} lead={12} tail={10} />
        </div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function ProofPathView({ proof }: { proof: ProofResponse }) {
  return (
    <div className="space-y-2">
      <StepRow marker="0" title="Start · Leaf hash" hash={proof.leaf} hint="your product" />

      {proof.steps.map((step, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-center">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <StepRow
            marker={i + 1}
            title={`Hash with sibling on the ${step.position}`}
            hash={step.sibling}
            side={step.position}
            hint={`keccak256(sort(running, sibling)) → parent at level ${i + 1}`}
          />
        </div>
      ))}

      <div className="flex items-center justify-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>
      <StepRow
        marker={<Flag className="h-3 w-3" />}
        title="Result · Recomputed Merkle Root"
        hash={proof.merkleRoot}
        hint="compare with the on-chain root"
      />

      <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
        Each sibling exists because, to climb one level, you hash your current
        node with the <em>one</em> node it was paired with. You don't need the
        whole tree — only {proof.steps.length} sibling
        {proof.steps.length === 1 ? "" : "s"} (≈ log₂ of the batch size) to
        rebuild the root. Change any product field and the leaf changes, the
        recomputed root no longer matches, and verification fails.
      </p>
    </div>
  );
}
