/**
 * backend/scripts/bench.ts
 * -----------------------------------------------------------------------------
 * Large-batch performance benchmark (Phase 4, Task 4.2). NOT part of the test
 * suite (timings are environment-dependent). Run with:
 *   npx tsx scripts/bench.ts
 *
 * Measures leaf hashing, tree build, and proof generation, and contrasts the
 * NAIVE approach (rebuild the tree per proof) with the CACHED approach (build
 * once, reuse) to demonstrate the Phase 4.1 optimization.
 * -----------------------------------------------------------------------------
 */
import { generateBatch } from "../../shared/batch";
import { hashProduct } from "../../shared/hash";
import { buildTree, getProof, proofFromTree } from "../../shared/merkle";

const SIZES = [1_000, 10_000, 100_000];
const PROOFS = 200; // number of proofs to generate per scenario

function ms(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

console.log(
  "size | hashLeaves | buildTree | proof(cached) x" +
    PROOFS +
    " | proof(naive) x" +
    PROOFS +
    " | speedup"
);
console.log("-".repeat(96));

for (const n of SIZES) {
  const batch = generateBatch("BENCH", n);

  let leaves: string[] = [];
  const tHash = ms(() => {
    leaves = batch.products.map(hashProduct);
  });

  let tree!: ReturnType<typeof buildTree>;
  const tBuild = ms(() => {
    tree = buildTree(leaves);
  });

  // Pick PROOFS evenly spread leaves.
  const idxs = Array.from({ length: PROOFS }, (_, k) =>
    Math.floor((k * n) / PROOFS)
  );

  const tCached = ms(() => {
    for (const i of idxs) proofFromTree(tree, leaves[i]);
  });

  const tNaive = ms(() => {
    for (const i of idxs) getProof(leaves, leaves[i]); // rebuilds the tree each call
  });

  const speedup = (tNaive / tCached).toFixed(1) + "x";
  console.log(
    `${String(n).padStart(6)} | ${tHash.toFixed(0).padStart(9)}ms | ${tBuild
      .toFixed(0)
      .padStart(8)}ms | ${tCached.toFixed(0).padStart(16)}ms | ${tNaive
      .toFixed(0)
      .padStart(15)}ms | ${speedup}`
  );
}
