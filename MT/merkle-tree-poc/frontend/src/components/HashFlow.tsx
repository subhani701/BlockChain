/**
 * HashFlow — educational component showing the pipeline:
 *   Product  ->  Canonical JSON  ->  keccak256 Hash (leaf)
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
          serial={product.serial} · sku={product.sku} ·
          batch={product.batch_id} · made={product.manufactured_at}
        </div>
      </div>

      <div className="flow-arrow">↓ JSON.stringify (canonical, fixed key order)</div>

      <div className="flow-step">
        <div className="flow-label">2 · Canonical JSON (the bytes that get hashed)</div>
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
