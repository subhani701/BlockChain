/**
 * HashFlow — educational component showing the pipeline:
 *   Product  ->  Canonical JSON  ->  keccak256 x2 (leaf)
 */
import { ArrowDown } from "lucide-react";
import type { Product } from "@/api/client";

interface Props {
  product: Product;
  encoded: string;
  leaf: string;
}

function Step({
  index,
  label,
  children
}: {
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {index} · {label}
      </div>
      <div className="hash-mono text-xs">{children}</div>
    </div>
  );
}

function Arrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <ArrowDown className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

export function HashFlow({ product, encoded, leaf }: Props) {
  return (
    <div className="space-y-2">
      <Step index="1" label="Product">
        <span className="text-foreground">
          serial={product.serial} · sku={product.sku} · batch={product.batch_id}{" "}
          · made={product.manufactured_at}
        </span>
      </Step>
      <Arrow>JSON.stringify (canonical, fixed key order)</Arrow>
      <Step index="2" label="Canonical JSON (bytes that get hashed)">
        <span className="break-all">{encoded}</span>
      </Step>
      <Arrow>keccak256 × 2 (double-hash)</Arrow>
      <Step index="3" label="Leaf hash (32 bytes, double-hashed)">
        <span className="break-all text-primary">{leaf}</span>
      </Step>
    </div>
  );
}
