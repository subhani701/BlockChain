/**
 * ProofPathView — visualizes how a leaf climbs to the root by hashing against
 * each sibling in the proof. Shows every sibling, its side (left/right), and
 * explains WHY each sibling is needed.
 */
import type { ProofResponse } from "../api/client";

export function ProofPathView({ proof }: { proof: ProofResponse }) {
  return (
    <div>
      <div className="proof-step">
        <span className="badge">0</span>
        <div>
          <div className="flow-label">Start · Leaf hash</div>
          <div className="hash">{proof.leaf}</div>
        </div>
        <span className="muted">your product</span>
      </div>

      {proof.steps.map((step, i) => (
        <div className="proof-step" key={i}>
          <span className="badge">{i + 1}</span>
          <div>
            <div className="flow-label">
              Hash with sibling on the {step.position}
            </div>
            <div className="hash">{step.sibling}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              keccak256(sort(runningHash, sibling)) → parent at level {i + 1}
            </div>
          </div>
          <span className={`badge ${step.position}`}>{step.position}</span>
        </div>
      ))}

      <div className="proof-step">
        <span className="badge">★</span>
        <div>
          <div className="flow-label">Result · Recomputed Merkle Root</div>
          <div className="hash">{proof.merkleRoot}</div>
        </div>
        <span className="muted">compare with on-chain root</span>
      </div>

      <p className="explain">
        Each sibling exists because, to climb one level, you must hash your
        current node with the <em>one</em> node it was paired with at that level.
        You don't need the whole tree — only {proof.steps.length} sibling
        {proof.steps.length === 1 ? "" : "s"} (≈ log₂ of the batch size) to
        rebuild the root. If any product field changes, the leaf changes, the
        recomputed root no longer matches, and verification fails.
      </p>
    </div>
  );
}
