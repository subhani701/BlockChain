/**
 * Field Verify — the anti-counterfeit check.
 *
 * SECURITY MODEL:
 *   The QR is attacker-controlled. We take ONLY the product + proof + batchId from
 *   it, recompute the leaf and climb the proof ourselves, and compare the result to
 *   the batch root READ FROM THE CHAIN at a contract WE trust (env-configured).
 *   The QR's own `leaf`, `root` and `contract` are treated as untrusted claims.
 *
 *   If the chain cannot be reached we return CANNOT_VERIFY — never a silent pass.
 */
import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  QrCode as QrCodeIcon,
  CircleCheck,
  CircleX,
  Package,
  ScanLine,
  Upload,
  ShieldAlert,
  Blocks
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import type { AppCtx } from "@/App";
import {
  recomputeFromBundle,
  verifyAgainstTrustedRoot,
  type VerificationBundle,
  type Recomputed
} from "@/lib/bundle";
import {
  readBatchFromChain,
  getRpcUrl,
  getTrustedContract,
  BatchNotRegisteredError,
  BATCH_STATUS,
  type OnChainBatch
} from "@/lib/chain";
import { decodeQrFromFile } from "@/lib/qr-decode";
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
import {
  VerifyTrace,
  revealSteps,
  type Step,
  type StepStatus
} from "@/components/verify-trace";

type Verdict = "AUTHENTIC" | "COUNTERFEIT" | "CANNOT_VERIFY";

interface Outcome {
  verdict: Verdict;
  reason: string;
  bundle: VerificationBundle;
  recomputed: Recomputed;
  onChain?: OnChainBatch;
  trustedContract?: string;
}

const VERDICT_STYLE: Record<Verdict, string> = {
  AUTHENTIC: "border-success/40 bg-success/10 text-success",
  COUNTERFEIT: "border-destructive/40 bg-destructive/10 text-destructive",
  CANNOT_VERIFY: "border-warning/40 bg-warning/10 text-warning"
};

export function FieldVerifyPage() {
  const { chain } = useOutletContext<AppCtx>();

  const [text, setText] = useState("");
  const [batchId, setBatchId] = useState("BATCH-DEMO");
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** Build the 4 verification steps for the trace. */
  function fieldSteps(
    r: { computedLeaf: string; computedRoot: string },
    s3: { value: string; status: StepStatus },
    s4: { value: string; status: StepStatus }
  ): Step[] {
    return [
      {
        label: "1 · Recompute leaf from the product fields",
        value: r.computedLeaf,
        status: "done"
      },
      {
        label: "2 · Climb the proof → reconstruct a root",
        value: r.computedRoot,
        status: "done"
      },
      {
        label: "3 · Read the batch root from the blockchain (trustless)",
        value: s3.value,
        status: s3.status
      },
      {
        label: "4 · Recomputed root  ==  on-chain root ?",
        value: s4.value,
        status: s4.status
      }
    ];
  }

  /** Prefill from a batch's first product (testing convenience). */
  async function loadExample() {
    setBusy("load");
    setError(null);
    try {
      const b = await api.getBatch(batchId.trim());
      const serial = b.products[0]?.serial;
      if (!serial) throw new Error("batch has no products");
      const proof = await api.getProof(serial, batchId.trim());
      setText(
        JSON.stringify(
          {
            v: 1,
            leafSpec: proof.leafSpec ?? "unknown",
            batchId: proof.batchId,
            product: proof.product,
            proof: proof.proof
          },
          null,
          2
        )
      );
      toast.success(`Loaded bundle for ${serial}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Decode an uploaded QR image, then verify it. */
  async function onQrFile(file: File | undefined) {
    if (!file) return;
    setBusy("scan");
    setError(null);
    setOutcome(null);
    try {
      const decoded = await decodeQrFromFile(file);
      setText(decoded);
      toast.success("QR decoded — verifying…");
      await onVerify(decoded);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /**
   * Fetch the authoritative root: prefer a DIRECT chain read (trustless); fall
   * back to the backend's /onchain route when no RPC is configured.
   */
  async function fetchOnChain(
    trusted: string,
    id: string
  ): Promise<OnChainBatch> {
    if (getRpcUrl()) {
      try {
        return await readBatchFromChain(trusted, id);
      } catch (e) {
        if (e instanceof BatchNotRegisteredError) throw e; // decisive → don't fall back
        // RPC unreachable → try the backend below.
      }
    }
    const b = await api.getOnChainBatch(id);
    return {
      merkleRoot: b.merkleRoot,
      status: b.status,
      version: b.version,
      source: "backend"
    };
  }

  async function onVerify(raw?: string) {
    setBusy("verify");
    setError(null);
    setOutcome(null);
    setSteps([]);
    try {
      const bundle = JSON.parse(raw ?? text) as VerificationBundle;
      if (!bundle?.product || !Array.isArray(bundle.proof) || !bundle.batchId) {
        throw new Error("Not a valid verification bundle.");
      }

      const recomputed = recomputeFromBundle(bundle);

      // TRUST ANCHOR: our configured contract, else the one the backend reports.
      // NEVER the contract named in the QR.
      const trustedContract = getTrustedContract() || chain?.contractAddress || "";
      if (!trustedContract) {
        await revealSteps(
          fieldSteps(
            recomputed,
            { value: "no trusted registry configured", status: "warn" },
            { value: "skipped", status: "skip" }
          ),
          setSteps
        );
        setOutcome({
          verdict: "CANNOT_VERIFY",
          reason:
            "No trusted registry address configured (VITE_CONTRACT_ADDRESS) and the chain status is unavailable.",
          bundle,
          recomputed
        });
        return;
      }

      // Read the authoritative root from the chain.
      let onChain: OnChainBatch;
      try {
        onChain = await fetchOnChain(trustedContract, bundle.batchId);
      } catch (e) {
        if (e instanceof BatchNotRegisteredError) {
          await revealSteps(
            fieldSteps(
              recomputed,
              { value: "batch not registered on-chain", status: "fail" },
              { value: "no on-chain root to compare", status: "fail" }
            ),
            setSteps
          );
          setOutcome({
            verdict: "COUNTERFEIT",
            reason: `This batch was never registered on-chain. ${e.message}`,
            bundle,
            recomputed,
            trustedContract
          });
          toast.error("COUNTERFEIT — batch not registered on-chain");
          return;
        }
        await revealSteps(
          fieldSteps(
            recomputed,
            { value: "chain unreachable", status: "warn" },
            { value: "skipped", status: "skip" }
          ),
          setSteps
        );
        setOutcome({
          verdict: "CANNOT_VERIFY",
          reason: `Could not read the batch root from the chain: ${(e as Error).message}`,
          bundle,
          recomputed,
          trustedContract
        });
        toast.warning("CANNOT VERIFY — chain unreachable");
        return;
      }

      // THE check: recomputed root vs the ON-CHAIN root.
      const { valid } = verifyAgainstTrustedRoot(bundle, onChain.merkleRoot);
      await revealSteps(
        fieldSteps(
          recomputed,
          { value: onChain.merkleRoot, status: "done" },
          {
            value: valid ? "MATCH" : "MISMATCH",
            status: valid ? "done" : "fail"
          }
        ),
        setSteps
      );
      const verdict: Verdict = valid ? "AUTHENTIC" : "COUNTERFEIT";
      const reason = valid
        ? `The proof reconstructs the batch root anchored on-chain${
            onChain.status !== 0
              ? ` — but this batch is ${BATCH_STATUS[onChain.status]}.`
              : "."
          }`
        : "The proof does not reconstruct the root anchored on-chain for this batch.";

      setOutcome({
        verdict,
        reason,
        bundle,
        recomputed,
        onChain,
        trustedContract
      });
      toast[valid ? "success" : "error"](verdict);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const notActive = outcome?.onChain && outcome.onChain.status !== 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Verify"
        description="Upload a product QR and verify it against the batch root read from the blockchain"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-muted-foreground" />
            Upload a QR image, or paste a verification bundle
          </CardTitle>
          <CardDescription>
            The QR supplies the product and its proof. The batch root is read from
            the blockchain — never from the QR — so a forged code cannot pass.
            {getRpcUrl() ? (
              <span className="mt-1 block text-xs">
                Reading the chain directly at{" "}
                <code className="font-mono">{getRpcUrl()}</code> (trustless).
              </span>
            ) : (
              <span className="mt-1 block text-xs">
                No <code className="font-mono">VITE_RPC_URL</code> set — falling
                back to the backend to read the chain.
              </span>
            )}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onQrFile(e.target.files?.[0])}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === "scan" ? <Spinner /> : <Upload />}
              {busy === "scan" ? "Decoding…" : "Upload QR image"}
            </Button>
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

          <Button
            onClick={() => onVerify()}
            disabled={busy !== null || !text.trim()}
          >
            {busy === "verify" ? <Spinner /> : <ScanLine />}
            Verify against the blockchain
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not verify</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Live verification trace — identical to the operator Verify page */}
      <VerifyTrace steps={steps} />

      {outcome && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* The verdict */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                VERDICT_STYLE[outcome.verdict]
              )}
            >
              {outcome.verdict === "AUTHENTIC" ? (
                <CircleCheck className="mt-0.5 h-8 w-8 shrink-0" />
              ) : outcome.verdict === "COUNTERFEIT" ? (
                <CircleX className="mt-0.5 h-8 w-8 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-8 w-8 shrink-0" />
              )}
              <div>
                <div className="text-xl font-bold tracking-tight">
                  {outcome.verdict.replace("_", " ")}
                </div>
                <div className="text-sm opacity-90">{outcome.reason}</div>
              </div>
            </div>

            {/* Genuine, but the batch was recalled/revoked */}
            {outcome.verdict === "AUTHENTIC" && notActive && (
              <Alert variant="warning">
                <AlertTitle>
                  Batch {BATCH_STATUS[outcome.onChain!.status]} — do not use
                </AlertTitle>
                <AlertDescription>
                  The part is genuine, but the manufacturer has marked this batch{" "}
                  {BATCH_STATUS[outcome.onChain!.status].toLowerCase()} on-chain.
                </AlertDescription>
              </Alert>
            )}

            {/* What was actually checked */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={outcome.onChain ? "success" : "secondary"}>
                {outcome.onChain
                  ? `root read from ${outcome.onChain.source === "chain" ? "chain (trustless)" : "backend"}`
                  : "on-chain root unavailable"}
              </Badge>
              {outcome.onChain && (
                <Badge
                  variant={
                    outcome.verdict === "AUTHENTIC" ? "success" : "destructive"
                  }
                >
                  recomputed root {outcome.verdict === "AUTHENTIC" ? "==" : "≠"}{" "}
                  on-chain root
                </Badge>
              )}
              {outcome.onChain && (
                <Badge variant={notActive ? "destructive" : "success"}>
                  batch {BATCH_STATUS[outcome.onChain.status]}
                </Badge>
              )}
            </div>

            {/* Product */}
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                Product (from the QR)
              </div>
              <div className="divide-y">
                <DetailRow label="Serial">
                  {outcome.bundle.product.serial}
                </DetailRow>
                <DetailRow label="SKU">{outcome.bundle.product.sku}</DetailRow>
                <DetailRow label="Batch">
                  {outcome.bundle.product.batch_id}
                </DetailRow>
                <DetailRow label="Manufactured">
                  {outcome.bundle.product.manufactured_at}
                </DetailRow>
              </div>
            </div>

            {/* The cryptography */}
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Blocks className="h-4 w-4 text-muted-foreground" />
                What we computed vs. what the chain says
              </div>
              <div className="divide-y">
                <DetailRow label="Leaf (recomputed from product)">
                  <HashDisplay value={outcome.recomputed.computedLeaf} />
                </DetailRow>
                <DetailRow label="Root (recomputed from proof)">
                  <HashDisplay value={outcome.recomputed.computedRoot} />
                </DetailRow>
                <DetailRow label="Root ON-CHAIN (authoritative)">
                  {outcome.onChain ? (
                    <HashDisplay value={outcome.onChain.merkleRoot} />
                  ) : (
                    <span className="text-muted-foreground">unavailable</span>
                  )}
                </DetailRow>
                <DetailRow label="Trusted registry">
                  <HashDisplay value={outcome.trustedContract ?? null} />
                </DetailRow>
                {outcome.onChain && (
                  <DetailRow label="Batch version (on-chain)">
                    {outcome.onChain.version}
                  </DetailRow>
                )}
                <DetailRow label="Leaf spec">{outcome.bundle.leafSpec}</DetailRow>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
