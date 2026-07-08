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
  Fuel,
  Blocks,
  ArrowRight,
  Package,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type HashedProduct,
  type VerifyResponse,
  type TamperResponse
} from "@/api/client";
import type { AppCtx } from "@/App";
import { PageHeader } from "@/components/page-header";
import { HashDisplay } from "@/components/hash-display";
import { DetailRow } from "@/components/detail-row";
import { CopyButton } from "@/components/copy-button";
import { Spinner } from "@/components/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Big VALID / INVALID banner. */
function Verdict({
  valid,
  label,
  sublabel
}: {
  valid: boolean;
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4",
        valid
          ? "border-success/40 bg-success/10 text-success"
          : "border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      {valid ? (
        <CircleCheck className="h-8 w-8" />
      ) : (
        <CircleX className="h-8 w-8" />
      )}
      <div>
        <div className="text-xl font-bold tracking-tight">{label}</div>
        {sublabel && <div className="text-sm opacity-90">{sublabel}</div>}
      </div>
    </div>
  );
}

export function VerifyPage() {
  const { activeBatch, chain } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState(activeBatch || "BATCH-001");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [serial, setSerial] = useState("");

  const [verify, setVerify] = useState<VerifyResponse | null>(null);
  const [verifiedProduct, setVerifiedProduct] = useState<HashedProduct | null>(
    null
  );
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [tamper, setTamper] = useState<TamperResponse | null>(null);
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

  async function onVerify(onChain: boolean) {
    setBusy(onChain ? "chain" : "off");
    setTamper(null);
    try {
      const res = onChain
        ? await api.verifyOnChain(batchId, serial)
        : await api.verifyOffChain(batchId, serial);
      setVerify(res);
      setVerifiedProduct(products.find((p) => p.serial === serial) ?? null);
      setVerifiedAt(new Date().toLocaleString());
      toast[res.valid ? "success" : "error"](
        `${res.result}${onChain ? " (on-chain)" : " (off-chain)"}`
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onTamper() {
    setBusy("tamper");
    setVerify(null);
    try {
      const res = await api.tamper(batchId, serial, field, newValue, chainUp);
      setTamper(res);
      toast[res.offchainResult === "VALID" ? "success" : "error"](
        `Tampered product: ${res.offchainResult}`
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const fieldVal = (p: Record<string, unknown>) => String(p[field] ?? "");

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

          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span wrapper so tooltip works while button is disabled */}
                <span>
                  <Button
                    onClick={() => onVerify(true)}
                    disabled={busy !== null || !chainUp || !serial}
                  >
                    {busy === "chain" ? <Spinner /> : <ShieldCheck />}
                    {busy === "chain"
                      ? "Verifying on-chain…"
                      : "Verify on Smart Contract"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!chainUp && (
                <TooltipContent>
                  Blockchain not connected — start Ganache + migrate.
                </TooltipContent>
              )}
            </Tooltip>
            <Button
              variant="secondary"
              onClick={() => onVerify(false)}
              disabled={busy !== null || !serial}
            >
              {busy === "off" ? <Spinner /> : <ShieldCheck />}
              {busy === "off" ? "Verifying…" : "Verify Off-chain"}
            </Button>
          </div>
          {!chainUp && (
            <p className="text-xs text-muted-foreground">
              On-chain verify is disabled while the chain is offline — the
              off-chain check still works.
            </p>
          )}
        </CardContent>
      </Card>

      {verify && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Verdict
              valid={verify.valid}
              label={verify.result}
              sublabel={
                verify.onChain ? "verified on-chain" : "verified off-chain"
              }
            />

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

            {/* Verification details */}
            <div className="divide-y">
              <DetailRow label="Leaf">
                <HashDisplay value={verify.leaf} />
              </DetailRow>
              <DetailRow label="Proof siblings">
                {verify.proof.length}
              </DetailRow>
              {verify.merkleRoot && (
                <DetailRow label="Merkle Root">
                  <HashDisplay value={verify.merkleRoot} />
                </DetailRow>
              )}
              {verify.onChain && (
                <>
                  <DetailRow label="Tx Hash">
                    <HashDisplay value={verify.onChain.txHash} />
                  </DetailRow>
                  <DetailRow label="Block">
                    <span className="inline-flex items-center gap-1">
                      <Blocks className="h-3.5 w-3.5 text-muted-foreground" />
                      {verify.onChain.blockNumber}
                    </span>
                  </DetailRow>
                  <DetailRow label="Gas Used">
                    <span className="inline-flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                      {verify.onChain.gasUsed.toLocaleString()}
                    </span>
                  </DetailRow>
                </>
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

            {/* Full Merkle proof (sibling hashes) */}
            {verify.proof.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="proof" className="border-b-0">
                  <AccordionTrigger className="py-2">
                    View Merkle proof ({verify.proof.length} sibling
                    {verify.proof.length === 1 ? "" : "s"})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs">
                        Sibling hashes (leaf → root)
                      </span>
                      <CopyButton
                        value={JSON.stringify(verify.proof)}
                        label="Proof copied"
                      />
                    </div>
                    <ol className="space-y-1">
                      {verify.proof.map((h, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="w-5 shrink-0 text-right text-muted-foreground">
                            {i + 1}
                          </span>
                          <HashDisplay value={h} lead={12} tail={10} />
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
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

      {tamper && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Verdict
              valid={tamper.offchainResult === "VALID"}
              label={tamper.offchainResult}
              sublabel={
                tamper.onchainResult
                  ? `on-chain: ${tamper.onchainResult}`
                  : "off-chain check"
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="success">Original</Badge>
                  <span className="text-xs text-muted-foreground">genuine</span>
                </div>
                <DetailRow label={tamper.field}>
                  <span className="hash-mono text-xs">
                    {fieldVal(
                      tamper.original.product as unknown as Record<string, unknown>
                    )}
                  </span>
                </DetailRow>
                <DetailRow label="Leaf">
                  <HashDisplay value={tamper.original.leaf} />
                </DetailRow>
              </div>

              <div className="rounded-lg border border-destructive/40 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="destructive">Tampered</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <DetailRow label={tamper.field}>
                  <span className="hash-mono text-xs text-destructive">
                    {fieldVal(
                      tamper.tampered.product as unknown as Record<string, unknown>
                    )}
                  </span>
                </DetailRow>
                <DetailRow label="Leaf">
                  {tamper.tampered.leaf ? (
                    <HashDisplay value={tamper.tampered.leaf} />
                  ) : (
                    <span className="text-xs text-destructive">
                      rejected (invalid)
                    </span>
                  )}
                </DetailRow>
              </div>
            </div>

            <p className="border-l-2 border-destructive/40 pl-3 text-sm text-muted-foreground">
              {tamper.explanation}
            </p>
            {tamper.onChainError && (
              <p className="text-sm text-warning">
                on-chain check: {tamper.onChainError}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
