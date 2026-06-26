/**
 * HashFlow — educational component showing the pipeline:
 *   Product  ->  Encoded Data (abi.encodePacked)  ->  keccak256 Hash (leaf)
 */
import type { Product } from "../api/client";

interface Props {
  product: Product;
  encoded: string;
  leaf: string;
}

export function HashFlow({ product, encoded, leaf }: Props) {
  return (
    <div className="flow">
      <div className="flow-step">
        <div className="flow-label">1 · Product</div>
        <div className="mono">
          productId={product.productId} · serial={product.serialNumber} ·
          batch={product.batchId} · date={product.manufactureDate}
        </div>
      </div>

      <div className="flow-arrow">↓ abi.encodePacked</div>

      <div className="flow-step">
        <div className="flow-label">2 · Encoded Data (tightly packed)</div>
        <div className="mono">{encoded}</div>
      </div>

      <div className="flow-arrow">↓ keccak256</div>

      <div className="flow-step">
        <div className="flow-label">3 · Leaf Hash (32 bytes)</div>
        <div className="hash">{leaf}</div>
      </div>
    </div>
  );
}
