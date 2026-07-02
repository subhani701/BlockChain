/**
 * Field Verify — the QR-scan verification flow (scan is mocked via paste).
 * Verifies a self-contained bundle OFFLINE in the browser (recompute leaf +
 * climb proof to the root), then optionally cross-checks the root with the
 * backend/on-chain registered root.
 */
import { useState } from "react";
import {
  QrCode as QrCodeIcon,
  CircleCheck,
  CircleX,
  Package,
  ScanLine
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import {
  verifyBundleOffline,
  type VerificationBundle,
  type OfflineResult
} from "@/lib/bundle";
import { PageHeader } from "@/components/page-header";
import { HashDisplay } from "@/components/hash-display";
import { DetailRow } from "@/components/detail-row";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Outcome {
  bundle: VerificationBundle;
  offline: OfflineResult;
  onChainRootMatch?: boolean | null; // null = not checked
}

export function FieldVerifyPage() {
  const [text, setText] = useState("");
  const [batchId, setBatchId] = useState("BATCH-DEMO");
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill the textarea from a batch's first product (testing convenience).
  async function loadExample() {
    setBusy("load");
    setError(null);
    try {
      const b = await api.getBatch(batchId.trim());
      const serial = b.products[0]?.serial;
      if (!serial) throw new Error("batch has no products");
      const proof = await api.getProof(serial, batchId.trim());
      const bundle: VerificationBundle = {
        v: 1,
        leafSpec: proof.leafSpec ?? "unknown",
        batchId: proof.batchId,
        contract: proof.contract ?? null,
        root: proof.merkleRoot,
        product: proof.product,
        leaf: proof.leaf,
        proof: proof.proof
      };
      setText(JSON.stringify(bundle, null, 2));
      toast.success(`Loaded bundle for ${serial}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onVerify() {
    setBusy("verify");
    setError(null);
    setOutcome(null);
    try {
      const bundle = JSON.parse(text) as VerificationBundle;
      if (!bundle.product || !bundle.proof || !bundle.root || !bundle.leaf) {
        throw new Error("not a valid verification bundle");
      }
      // 1) Fully offline verification (no backend, no chain).
      const offline = verifyBundleOffline(bundle);

      // 2) Optional cross-check: does the bundle root match the registered root?
      let onChainRootMatch: boolean | null = null;
      try {
        const b = await api.getBatch(bundle.batchId);
        onChainRootMatch =
          b.merkleRoot.toLowerCase() === bundle.root.toLowerCase();
      } catch {
        onChainRootMatch = null; // backend/batch unavailable — offline result stands
      }

      setOutcome({ bundle, offline, onChainRootMatch });
      toast[offline.valid ? "success" : "error"](
        offline.valid ? "Bundle VALID (offline)" : "Bundle INVALID"
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Verify"
        description="Scan a product QR (mocked via paste) and verify it offline against the on-chain root"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-muted-foreground" />
            Scan / paste a verification bundle
          </CardTitle>
          <CardDescription>
            In production a technician scans the product QR. Here, paste the
            bundle JSON (from the Proof page's “Copy bundle”, or load an example).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:w-64">
              <Label htmlFor="batchId">Load example from batch</Label>
              <Input
                id="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={loadExample}
              disabled={busy !== null}
            >
              {busy === "load" ? <Spinner /> : <QrCodeIcon />}
              Load example
            </Button>
          </div>

          <textarea
            className="h-40 w-full rounded-md border border-input bg-background p-3 font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Paste the verification bundle JSON here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <Button onClick={onVerify} disabled={busy !== null || !text.trim()}>
            {busy === "verify" ? <Spinner /> : <ScanLine />}
            Verify bundle
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not verify</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {outcome && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4",
                outcome.offline.valid
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              {outcome.offline.valid ? (
                <CircleCheck className="h-8 w-8" />
              ) : (
                <CircleX className="h-8 w-8" />
              )}
              <div>
                <div className="text-xl font-bold tracking-tight">
                  {outcome.offline.valid ? "VALID" : "INVALID"}
                </div>
                <div className="text-sm opacity-90">
                  verified offline in the browser (no backend)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={outcome.offline.leafOk ? "success" : "destructive"}>
                leaf {outcome.offline.leafOk ? "matches" : "mismatch"}
              </Badge>
              <Badge variant={outcome.offline.rootOk ? "success" : "destructive"}>
                proof → root {outcome.offline.rootOk ? "matches" : "mismatch"}
              </Badge>
              {outcome.onChainRootMatch === true && (
                <Badge variant="success">root matches registered root</Badge>
              )}
              {outcome.onChainRootMatch === false && (
                <Badge variant="destructive">root ≠ registered root</Badge>
              )}
              {outcome.onChainRootMatch === null && (
                <Badge variant="secondary">registered root not checked</Badge>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                Product
              </div>
              <div className="divide-y">
                <DetailRow label="Serial">{outcome.bundle.product.serial}</DetailRow>
                <DetailRow label="SKU">{outcome.bundle.product.sku}</DetailRow>
                <DetailRow label="Batch">
                  {outcome.bundle.product.batch_id}
                </DetailRow>
                <DetailRow label="Manufactured">
                  {outcome.bundle.product.manufactured_at}
                </DetailRow>
              </div>
            </div>

            <div className="divide-y">
              <DetailRow label="Recomputed leaf">
                <HashDisplay value={outcome.offline.computedLeaf} />
              </DetailRow>
              <DetailRow label="Recomputed root">
                <HashDisplay value={outcome.offline.computedRoot} />
              </DetailRow>
              <DetailRow label="Claimed root">
                <HashDisplay value={outcome.bundle.root} />
              </DetailRow>
              <DetailRow label="Contract">
                <HashDisplay value={outcome.bundle.contract} />
              </DetailRow>
              <DetailRow label="Leaf spec">{outcome.bundle.leafSpec}</DetailRow>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
