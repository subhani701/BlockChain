/**
 * Product QR — the manufacturer's QR flow: pick a batch, pick a product, and get
 * that product's scannable verification QR (the slim bundle the mobile Field
 * Verify app reads). Batch is chosen from a dropdown of existing batches, and the
 * QR appears as soon as a product is selected — no extra steps.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  QrCode as QrCodeIcon,
  Download,
  Printer,
  Copy,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { makeBundle } from "@/lib/bundle";
import {
  api,
  type HashedProduct,
  type ProofResponse,
  type Product
} from "@/api/client";
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

type BatchRow = {
  batchId: string;
  totalProducts: number;
  onChain: unknown | null;
};

const STATUS_LABEL = ["Active", "Recalled", "Revoked"];

export function ProductQrPage() {
  const { activeBatch, setActiveBatch } = useOutletContext<AppCtx>();

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchId, setBatchId] = useState<string>(activeBatch || "");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [serial, setSerial] = useState<string>("");
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [tamper, setTamper] = useState(false);
  const [draft, setDraft] = useState<Product | null>(null);
  const [registering, setRegistering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // On-chain status of the selected batch: undefined = loading, null = not anchored.
  const [chain, setChain] = useState<
    { status: number } | null | undefined
  >(undefined);

  // Load the list of batches once.
  useEffect(() => {
    api
      .listBatches()
      .then((rows) => {
        setBatches(rows);
        if (!batchId && rows[0]) setBatchId(rows[0].batchId);
      })
      .catch((e) => setLoadError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the batch changes, load its products + on-chain status.
  useEffect(() => {
    if (!batchId) return;
    setLoadError(null);
    setProof(null);
    setQrDataUrl("");
    setChain(undefined);
    api
      .getBatch(batchId)
      .then((b) => {
        setProducts(b.products);
        setSerial(b.products[0]?.serial ?? "");
      })
      .catch((e) => {
        setProducts([]);
        setSerial("");
        setLoadError((e as Error).message);
      });
    api
      .getOnChainBatch(batchId)
      .then((c) => setChain({ status: c.status }))
      .catch(() => setChain(null)); // 404 (not anchored) or chain down
  }, [batchId]);

  // When the product changes, fetch its proof and build the QR — automatically.
  useEffect(() => {
    if (!batchId || !serial) {
      setProof(null);
      return;
    }
    let alive = true;
    setTamper(false); // always start from the genuine QR when the product changes
    setDraft(null);
    setBusy(true);
    api
      .getProof(serial, batchId)
      .then((p) => {
        if (!alive) return;
        setProof(p);
        setActiveBatch(batchId);
      })
      .catch((e) => alive && toast.error((e as Error).message))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial, batchId]);

  // Genuine bundle from the proof; in Tampered mode we swap in the editable `draft`
  // product (the proof is unchanged) — so if ANY field differs, the recomputed leaf
  // → root no longer matches the on-chain root ("Could not verify").
  const baseBundle = useMemo(() => (proof ? makeBundle(proof) : null), [proof]);
  const bundle = useMemo(() => {
    if (!baseBundle) return null;
    if (!tamper || !draft) return baseBundle;
    return { ...baseBundle, product: draft };
  }, [baseBundle, tamper, draft]);

  const PRODUCT_FIELDS = [
    { key: "serial", label: "Serial" },
    { key: "sku", label: "SKU" },
    { key: "batch_id", label: "Batch ID" },
    { key: "manufactured_at", label: "Manufactured at" }
  ] as const;

  const isModified = !!(
    baseBundle &&
    draft &&
    PRODUCT_FIELDS.some((f) => draft[f.key] !== baseBundle.product[f.key])
  );

  const bundleStr = useMemo(
    () => (bundle ? JSON.stringify(bundle) : ""),
    [bundle]
  );

  function startTamper() {
    setTamper(true);
    if (baseBundle) setDraft({ ...baseBundle.product });
  }

  // Render the QR whenever the bundle changes.
  useEffect(() => {
    if (!bundleStr) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(bundleStr, {
      margin: 2,
      width: 512,
      errorCorrectionLevel: "M"
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [bundleStr]);

  async function registerOnChain() {
    if (!batchId) return;
    setRegistering(true);
    try {
      await api.registerBatch(batchId);
      const c = await api.getOnChainBatch(batchId);
      setChain({ status: c.status });
      toast.success(`${batchId} anchored on-chain`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRegistering(false);
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !proof) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${proof.product.serial}-qr.png`;
    a.click();
    toast.success("QR downloaded");
  }

  function printLabel() {
    if (!qrDataUrl || !proof) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) {
      toast.error("Popup blocked — allow popups to print.");
      return;
    }
    const p = proof.product;
    w.document.write(`<!doctype html><title>${p.serial}</title>
      <body style="font-family:system-ui;text-align:center;padding:24px;margin:0">
        <div style="font-weight:700;color:#C4081F">VoltusWave</div>
        <div style="font-size:13px;margin:2px 0 10px">${p.sku} · ${p.serial}</div>
        <img src="${qrDataUrl}" style="width:320px;height:320px"/>
        <div style="font-size:11px;color:#64748b;margin-top:8px">Batch ${p.batch_id} · scan to verify</div>
      </body>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const activeBatchRow = batches.find((b) => b.batchId === batchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product QR"
        description="Pick a batch and a product to get its scannable verification QR"
      />

      {/* Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
            Select a product
          </CardTitle>
          <CardDescription>
            The QR encodes a slim bundle (product fields + Merkle proof + batch
            id) — the same evidence the mobile Field Verify app recomputes and
            checks against the on-chain root.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a batch…" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.batchId} value={b.batchId}>
                      {b.batchId} · {b.totalProducts} products
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {loadError && (
            <Alert variant="warning" className="mt-4">
              <AlertTitle>Batch not available</AlertTitle>
              <AlertDescription>
                {loadError} — generate it on the{" "}
                <Link to="/generate" className="underline">
                  Batch &amp; Tree
                </Link>{" "}
                page first.
              </AlertDescription>
            </Alert>
          )}

          {/* On-chain readiness hint + one-click register */}
          {batchId && chain === null && (
            <Alert variant="warning" className="mt-4">
              <AlertTitle>Not anchored on-chain</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  This batch isn’t registered on-chain, so a scan will read{" "}
                  <strong>“Could not verify”</strong>. Anchor it now to make its
                  QRs verify as authentic.
                </p>
                <Button
                  size="sm"
                  onClick={registerOnChain}
                  disabled={registering}
                >
                  {registering ? <Spinner /> : <ShieldCheck />}
                  {registering ? "Anchoring…" : "Register on-chain"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* QR output */}
      {proof && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
              QR for {proof.product.serial}
              {isModified ? (
                <Badge variant="destructive" className="ml-1">
                  Tampered
                </Badge>
              ) : (
                activeBatchRow &&
                chain && (
                  <Badge
                    variant={chain.status === 0 ? "success" : "warning"}
                    className="ml-1"
                  >
                    On-chain · {STATUS_LABEL[chain.status] ?? "?"}
                  </Badge>
                )
              )}
            </CardTitle>
            <CardDescription>
              {proof.product.sku} · batch {proof.product.batch_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Genuine ↔ Tampered demo toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Demo:
              </span>
              <Button
                variant={tamper ? "outline" : "default"}
                size="sm"
                onClick={() => setTamper(false)}
              >
                <CheckCircle2 />
                Genuine
              </Button>
              <Button
                variant={tamper ? "destructive" : "outline"}
                size="sm"
                onClick={startTamper}
              >
                <AlertTriangle />
                Tampered
              </Button>
            </div>

            {tamper && draft && (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Edit any field — the QR updates live. Any change breaks the
                    proof, so a scan reads “Could not verify”.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isModified}
                    onClick={() => setDraft({ ...baseBundle!.product })}
                  >
                    Reset
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRODUCT_FIELDS.map((f) => {
                    const changed =
                      baseBundle != null &&
                      draft[f.key] !== baseBundle.product[f.key];
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label className="flex items-center gap-2 text-xs">
                          {f.label}
                          {changed && (
                            <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                              changed
                            </Badge>
                          )}
                        </Label>
                        <Input
                          value={draft[f.key]}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, [f.key]: e.target.value } : d
                            )
                          }
                          className={`font-mono text-xs ${
                            changed ? "border-destructive" : ""
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                {!isModified && (
                  <p className="text-xs text-muted-foreground">
                    Unchanged so far — this still matches the genuine product and
                    would scan as authentic. Edit a field to forge it.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div
                className={`rounded-xl border bg-white p-3 ${
                  tamper ? "border-destructive" : ""
                }`}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR for ${proof.product.serial}`}
                    className="h-56 w-56"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center">
                    <Spinner />
                  </div>
                )}
              </div>

              <div className="w-full space-y-4">
              {isModified ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Tampered — scans as “Could not verify”.
                </div>
              ) : (
                chain?.status === 0 && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Anchored &amp; Active — scans as authentic.
                  </div>
                )
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadQr}>
                  <Download />
                  Download PNG
                </Button>
                <Button variant="outline" size="sm" onClick={printLabel}>
                  <Printer />
                  Print label
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

              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  Verify on mobile
                </div>
                <p className="mt-1">
                  Open the VoltusWave <strong>Field Verify</strong> app, point it
                  at this QR → it recomputes the leaf, climbs the proof, and
                  compares to the on-chain root.
                </p>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Bundle {bundleStr.length} bytes · leaf spec{" "}
                {proof.leafSpec ?? "?"} · {proof.proof.length} proof sibling
                {proof.proof.length === 1 ? "" : "s"}
              </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {batchId && !proof && !busy && products.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Select a product to generate its QR.
        </p>
      )}

      {busy && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Building QR…
        </div>
      )}
    </div>
  );
}
