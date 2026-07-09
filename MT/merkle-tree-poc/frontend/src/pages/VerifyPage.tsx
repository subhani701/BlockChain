/**
 * Verify & Tamper — verify a product on/off-chain and run the tampering demo.
 */
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ShieldCheck,
  FlaskConical,
  CircleCheck,
  CircleX,
  ShieldAlert,
  ArrowRight,
  Package,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type HashedProduct,
  type AuthenticityResponse
} from "@/api/client";
import type { AppCtx } from "@/App";
import { PageHeader } from "@/components/page-header";
import { HashDisplay } from "@/components/hash-display";
import { DetailRow } from "@/components/detail-row";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  VerifyTrace,
  revealSteps,
  type Step
} from "@/components/verify-trace";
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
import { cn } from "@/lib/utils";

/** Turn an authenticity result into the ordered steps the check actually ran. */
function buildSteps(res: AuthenticityResponse): Step[] {
  const anchored = res.checks.root_anchored_on_chain.passed;
  const matches = res.checks.merkle_proof_valid.passed;
  const unreachable = res.result === "CANNOT_VERIFY";
  return [
    {
      label: "1 · Recompute leaf from the product fields",
      value: res.computed.leaf,
      status: "done"
    },
    {
      label: "2 · Climb the proof → reconstruct a root",
      value: res.computed.root,
      status: "done"
    },
    {
      label: "3 · Read the batch root from the blockchain",
      value: unreachable
        ? "chain unreachable"
        : anchored
          ? res.onChain!.merkleRoot
          : "batch not registered on-chain",
      status: unreachable ? "warn" : anchored ? "done" : "fail"
    },
    {
      label: "4 · Recomputed root  ==  on-chain root ?",
      value: unreachable ? "skipped" : matches ? "MATCH" : "MISMATCH",
      status: unreachable ? "skip" : matches ? "done" : "fail"
    }
  ];
}


export function VerifyPage() {
  const { activeBatch, chain } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState(activeBatch || "BATCH-001");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [serial, setSerial] = useState("");

  const [verify, setVerify] = useState<AuthenticityResponse | null>(null);
  const [verifiedProduct, setVerifiedProduct] = useState<HashedProduct | null>(
    null
  );
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [tamperInfo, setTamperInfo] = useState<{
    field: string;
    originalValue: string;
    newValue: string;
    originalLeaf: string;
    tamperedLeaf: string;
  } | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [field, setField] = useState("serial");
  const [newValue, setNewValue] = useState("SN-COUNTERFEIT-0001");

  const chainUp = chain?.connected === true;

  useEffect(() => {
    if (!batchId) return;
    api
      .getBatch(batchId)
      .then((b) => {
        setProducts(b.products);
        setSerial(b.products[0]?.serial ?? "");
      })
      .catch((e) => {
        setProducts([]);
        toast.error((e as Error).message);
      });
  }, [batchId]);

  /** Reveal the verification steps one at a time, then show the verdict. */
  async function revealAndSet(
    res: AuthenticityResponse,
    product: HashedProduct | null,
    tinfo: typeof tamperInfo
  ) {
    await revealSteps(buildSteps(res), setSteps);
    setVerify(res);
    setVerifiedProduct(product);
    setVerifiedAt(new Date().toLocaleString());
    setTamperInfo(tinfo);
    const t =
      res.result === "AUTHENTIC"
        ? "success"
        : res.result === "COUNTERFEIT"
          ? "error"
          : "warning";
    toast[t](res.result.replace("_", " "));
  }

  function reset() {
    setVerify(null);
    setSteps([]);
    setTamperInfo(null);
  }

  async function onVerify() {
    setBusy("verify");
    reset();
    try {
      const res = await api.verifyAuthenticity(batchId, serial);
      await revealAndSet(res, products.find((p) => p.serial === serial) ?? null, null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /**
   * Tamper demo: take the GENUINE product's proof, change one field, and run the
   * SAME on-chain verification. The tampered leaf climbs the original proof to a
   * wrong root → COUNTERFEIT. Shows the identical trace as a normal verify.
   */
  async function onTamper() {
    setBusy("tamper");
    reset();
    try {
      const genuine = await api.getProof(serial, batchId); // real product + proof
      const originalValue = String(
        (genuine.product as unknown as Record<string, unknown>)[field] ?? ""
      );
      const tampered = { ...genuine.product, [field]: newValue };
      const res = await api.verifyAuthenticityBundle(
        batchId,
        tampered,
        genuine.proof
      );
      await revealAndSet(
        res,
        { ...(products.find((p) => p.serial === serial) as HashedProduct), ...tampered },
        {
          field,
          originalValue,
          newValue,
          originalLeaf: genuine.leaf,
          tamperedLeaf: res.computed.leaf
        }
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify & Tamper"
        description="Verify a product against the on-chain root, then prove that tampering fails"
      />

      {/* Verify */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Verify a product
          </CardTitle>
          <CardDescription>
            The contract recomputes the root from the product's leaf + proof and
            compares it to the stored root. Match → genuine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="batchId">Batch ID</Label>
              <Input
                id="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
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
          </div>

          <Button onClick={onVerify} disabled={busy !== null || !serial}>
            {busy === "verify" ? <Spinner /> : <ShieldCheck />}
            {busy === "verify" ? "Verifying…" : "Verify"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recomputes the leaf, climbs the proof, and compares it to the batch
            root read from the blockchain — gas-free (a read, no transaction).
            {!chainUp &&
              " The chain appears offline, so this will report CANNOT VERIFY."}
          </p>
        </CardContent>
      </Card>

      {/* Live verification trace — the steps the check actually runs */}
      <VerifyTrace steps={steps} />

      {verify && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* 3-state verdict, compared against the ON-CHAIN root */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                verify.result === "AUTHENTIC"
                  ? "border-success/40 bg-success/10 text-success"
                  : verify.result === "COUNTERFEIT"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-warning/40 bg-warning/10 text-warning"
              )}
            >
              {verify.result === "AUTHENTIC" ? (
                <CircleCheck className="mt-0.5 h-8 w-8 shrink-0" />
              ) : verify.result === "COUNTERFEIT" ? (
                <CircleX className="mt-0.5 h-8 w-8 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-8 w-8 shrink-0" />
              )}
              <div>
                <div className="text-xl font-bold tracking-tight">
                  {verify.result.replace("_", " ")}
                </div>
                <div className="text-sm opacity-90">
                  proof recomputed locally and compared to the batch root on the
                  blockchain
                </div>
              </div>
            </div>

            {/* Warnings (e.g. genuine but recalled batch) */}
            {verify.warnings.map((w, i) => (
              <Alert key={i} variant="warning">
                <AlertDescription>{w}</AlertDescription>
              </Alert>
            ))}

            {/* The named on-chain checks (project.md's crypto trio) */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(verify.checks).map(([name, c]) => (
                <Badge key={name} variant={c.passed ? "success" : "destructive"}>
                  {name} {c.passed ? "✓" : "✗"}
                </Badge>
              ))}
            </div>

            {/* Product details */}
            {verifiedProduct && (
              <div className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Product details
                </div>
                <div className="divide-y">
                  <DetailRow label="Serial">
                    {verifiedProduct.serial}
                  </DetailRow>
                  <DetailRow label="SKU">{verifiedProduct.sku}</DetailRow>
                  <DetailRow label="Batch">
                    {verifiedProduct.batch_id}
                  </DetailRow>
                  <DetailRow label="Manufactured">
                    {verifiedProduct.manufactured_at}
                  </DetailRow>
                </div>
              </div>
            )}

            {/* What we computed vs. what the chain says */}
            <div className="divide-y">
              <DetailRow label="Leaf (recomputed)">
                <HashDisplay value={verify.computed.leaf} />
              </DetailRow>
              <DetailRow label="Root (recomputed from proof)">
                <HashDisplay value={verify.computed.root} />
              </DetailRow>
              <DetailRow label="Root ON-CHAIN (authoritative)">
                {verify.onChain ? (
                  <HashDisplay value={verify.onChain.merkleRoot} />
                ) : (
                  <span className="text-muted-foreground">unavailable</span>
                )}
              </DetailRow>
              {verify.onChain && (
                <DetailRow label="Batch version (on-chain)">
                  {verify.onChain.version}
                </DetailRow>
              )}
              {verifiedAt && (
                <DetailRow label="Verified at">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {verifiedAt}
                  </span>
                </DetailRow>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tamper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Tampering demo
          </CardTitle>
          <CardDescription>
            Change one field of a genuine product and verify it with the
            original proof — it must fail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:w-48">
              <Label>Field to tamper</Label>
              <Select
                value={field}
                onValueChange={(f) => {
                  setField(f);
                  // Auto-fill a sensible (valid-but-wrong) value for the chosen
                  // field, so tampering always produces a clean INVALID — e.g.
                  // manufactured_at needs a real date, not "SN-COUNTERFEIT-0001".
                  setNewValue(
                    f === "sku"
                      ? "FAKE-SKU-9999"
                      : f === "manufactured_at"
                        ? "2020-01-01T00:00:00.000Z"
                        : "SN-COUNTERFEIT-0001"
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serial">serial</SelectItem>
                  <SelectItem value="sku">sku</SelectItem>
                  <SelectItem value="manufactured_at">
                    manufactured_at
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="newValue">New value</Label>
              <Input
                id="newValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              onClick={onTamper}
              disabled={busy !== null || !serial}
            >
              {busy === "tamper" ? <Spinner /> : <FlaskConical />}
              {busy === "tamper" ? "Tampering…" : "Tamper Product"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What was tampered — shown alongside the shared trace + verdict above. */}
      {tamperInfo && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="text-sm font-medium">What changed</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="success">Original</Badge>
                  <span className="text-xs text-muted-foreground">genuine</span>
                </div>
                <DetailRow label={tamperInfo.field}>
                  <span className="hash-mono text-xs">
                    {tamperInfo.originalValue}
                  </span>
                </DetailRow>
                <DetailRow label="Leaf">
                  <HashDisplay value={tamperInfo.originalLeaf} />
                </DetailRow>
              </div>

              <div className="rounded-lg border border-destructive/40 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="destructive">Tampered</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <DetailRow label={tamperInfo.field}>
                  <span className="hash-mono text-xs text-destructive">
                    {tamperInfo.newValue}
                  </span>
                </DetailRow>
                <DetailRow label="Leaf">
                  <HashDisplay value={tamperInfo.tamperedLeaf} />
                </DetailRow>
              </div>
            </div>
            <p className="border-l-2 border-destructive/40 pl-3 text-sm text-muted-foreground">
              One changed field → a different leaf → the original proof rebuilds a
              wrong root → it no longer matches the root anchored on-chain.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
