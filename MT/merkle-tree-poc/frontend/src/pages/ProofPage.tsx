/**
 * Proof — select a product, generate its Merkle proof, and visualize the path.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  GitBranch,
  Fingerprint,
  Search,
  QrCode as QrCodeIcon,
  Download,
  Copy
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { QrCode } from "@/components/qr-code";
import { makeBundle } from "@/lib/bundle";
import {
  api,
  type HashedProduct,
  type ProofResponse,
  type TreeResponse
} from "@/api/client";
import { ProofPathView } from "@/components/ProofPathView";
import { MerkleTreeView } from "@/components/MerkleTreeView";
import { HashFlow } from "@/components/HashFlow";
import { PageHeader } from "@/components/page-header";
import { Spinner } from "@/components/spinner";
import type { AppCtx } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ProofPage() {
  const { activeBatch, setActiveBatch } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState(activeBatch || "BATCH-001");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [serial, setSerial] = useState("");
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load products + tree when the batch changes.
  useEffect(() => {
    if (!batchId) return;
    setLoadError(null);
    setProof(null);
    Promise.all([api.getBatch(batchId), api.getTree(batchId)])
      .then(([b, t]) => {
        setProducts(b.products);
        setSerial(b.products[0]?.serial ?? "");
        setTree(t);
      })
      .catch((e) => {
        setProducts([]);
        setTree(null);
        setLoadError((e as Error).message);
      });
  }, [batchId]);

  async function onGenerateProof() {
    if (!serial) return;
    setBusy(true);
    try {
      const res = await api.getProof(serial, batchId);
      setProof(res);
      setActiveBatch(batchId);
      toast.success(`Proof generated (${res.proof.length} siblings)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const siblingSet = useMemo(
    () => (proof ? new Set(proof.proof) : undefined),
    [proof]
  );

  const bundleStr = useMemo(
    () => (proof ? JSON.stringify(makeBundle(proof)) : ""),
    [proof]
  );

  async function downloadQr() {
    if (!bundleStr) return;
    const url = await QRCode.toDataURL(bundleStr, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: "M"
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proof?.product.serial ?? "product"}-qr.png`;
    a.click();
    toast.success("QR downloaded");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proof"
        description="Generate a Merkle proof for one product and visualize its path to the root"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            Generate a Merkle proof
          </CardTitle>
          <CardDescription>
            A proof is the short list of sibling hashes (≈ log₂ n) needed to
            rebuild the root from one product — not the whole tree.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="batchId">Batch ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="batchId"
                  className="pl-8"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Product</Label>
              <Select
                value={serial}
                onValueChange={setSerial}
                disabled={products.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.serial} value={p.serial}>
                      {p.serial} — {p.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onGenerateProof} disabled={busy || !serial}>
              {busy ? <Spinner /> : <GitBranch />}
              {busy ? "Generating…" : "Generate Proof"}
            </Button>
          </div>

          {loadError && (
            <Alert variant="warning" className="mt-4">
              <AlertTitle>Batch not available</AlertTitle>
              <AlertDescription>
                {loadError} — generate the batch first on the Batch &amp; Tree
                page.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {proof && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                Leaf for {proof.product.serial}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HashFlow
                product={proof.product}
                encoded={proof.encoded}
                leaf={proof.leaf}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Proof path
                <Badge variant="secondary">
                  {proof.proof.length} sibling
                  {proof.proof.length === 1 ? "" : "s"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProofPathView proof={proof} />
            </CardContent>
          </Card>

          {/* QR — self-contained verification bundle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                Product QR (scan to verify)
              </CardTitle>
              <CardDescription>
                Encodes a self-contained bundle (product + leaf + proof + root +
                contract + leaf spec) — verifiable offline against the on-chain
                root, so it survives even if this backend is gone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <QrCode value={bundleStr} />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Bundle size: {bundleStr.length} bytes · leaf spec{" "}
                  {proof.leafSpec ?? "?"}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={downloadQr}>
                    <Download />
                    Download QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(bundleStr);
                      toast.success("Bundle copied");
                    }}
                  >
                    <Copy />
                    Copy bundle
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Test it on the{" "}
                  <Link to="/field-verify" className="text-primary underline">
                    Field Verify
                  </Link>{" "}
                  page — paste the bundle to simulate a scan.
                </p>
              </div>
            </CardContent>
          </Card>

          {tree && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Where the proof lives in the tree
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-4 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    your leaf
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                    proof siblings
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MerkleTreeView
                  levels={tree.levels}
                  leaf={proof.leaf}
                  siblingNodes={siblingSet}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
