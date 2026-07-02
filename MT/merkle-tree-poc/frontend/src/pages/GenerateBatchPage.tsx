/**
 * Batch & Tree — generate a batch, inspect products, build the Merkle tree,
 * and anchor the root on-chain. All original functionality preserved.
 */
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Boxes,
  Layers,
  Anchor,
  Search,
  PackagePlus,
  FileJson,
  ShieldAlert,
  Download
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type CreateBatchResponse,
  type TreeResponse,
  type RegisterResponse
} from "@/api/client";
import { HashFlow } from "@/components/HashFlow";
import { MerkleTreeView } from "@/components/MerkleTreeView";
import { PageHeader } from "@/components/page-header";
import { HashDisplay } from "@/components/hash-display";
import { DetailRow } from "@/components/detail-row";
import { Spinner } from "@/components/spinner";
import type { AppCtx } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

const COUNT_MIN = 1;
const COUNT_MAX = 1024;

export function GenerateBatchPage() {
  const { setActiveBatch, chain } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState("BATCH-001");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [batch, setBatch] = useState<CreateBatchResponse | null>(null);
  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [registered, setRegistered] = useState<RegisterResponse | null>(null);

  const batchIdValid = batchId.trim().length > 0;
  const countValid = Number.isInteger(count) && count >= COUNT_MIN && count <= COUNT_MAX;

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(label);
    try {
      return await fn();
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onGenerate() {
    if (!batchIdValid || !countValid) return;
    setTree(null);
    setRegistered(null);
    const res = await run("create", () => api.createBatch(batchId.trim(), count));
    if (res) {
      setBatch(res);
      setActiveBatch(res.batchId);
      toast.success(`Batch ${res.batchId} generated (${res.totalProducts} products)`);
    }
  }

  async function onBuildTree() {
    const res = await run("tree", () => api.getTree(batchId.trim()));
    if (res) {
      setTree(res);
      toast.success("Merkle tree built");
    }
  }

  async function onRegister() {
    setConfirmOpen(false);
    const res = await run("register", () => api.registerBatch(batchId.trim()));
    if (res) {
      setRegistered(res);
      toast.success(`Root anchored on-chain (block ${res.onChain.blockNumber})`);
    }
  }

  async function onExportPack() {
    const pack = await run("pack", () => api.getProofPack(batchId.trim()));
    if (pack) {
      const blob = new Blob([JSON.stringify(pack, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pack.batchId}-proof-pack.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${pack.count} proofs (leaf spec ${pack.leafSpec})`);
    }
  }

  const filteredProducts = useMemo(() => {
    if (!batch) return [];
    const q = search.trim().toLowerCase();
    if (!q) return batch.products;
    return batch.products.filter(
      (p) =>
        p.serial.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [batch, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch & Tree"
        description="Generate a batch, build its Merkle tree, and anchor the root on-chain"
      />

      {/* Step 1 — Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4 text-muted-foreground" />
            Step 1 · Generate a manufacturing batch
          </CardTitle>
          <CardDescription>
            Products are hashed into leaves; only the Merkle root is stored
            on-chain — O(1) regardless of batch size.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="batchId">
                Batch ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                aria-invalid={!batchIdValid}
              />
              {!batchIdValid && (
                <p className="text-xs text-destructive">Batch ID is required.</p>
              )}
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label htmlFor="count">
                Product count <span className="text-destructive">*</span>
              </Label>
              <Input
                id="count"
                type="number"
                min={COUNT_MIN}
                max={COUNT_MAX}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                aria-invalid={!countValid}
              />
              {!countValid && (
                <p className="text-xs text-destructive">
                  {COUNT_MIN}–{COUNT_MAX} only.
                </p>
              )}
            </div>
            <Button
              onClick={onGenerate}
              disabled={busy !== null || !batchIdValid || !countValid}
              className="sm:mb-0"
            >
              {busy === "create" ? <Spinner /> : <PackagePlus />}
              {busy === "create" ? "Generating…" : "Generate Batch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {batch && (
        <>
          {/* Products table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    Products
                    <Badge variant="secondary">{batch.totalProducts}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Each product → canonical JSON → keccak256 leaf.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search serial or SKU…"
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportPack}
                    disabled={busy !== null}
                    title="Download a self-contained, offline-verifiable proof pack"
                  >
                    {busy === "pack" ? <Spinner /> : <Download />}
                    Export proofs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Manufactured
                      </TableHead>
                      <TableHead>Leaf (keccak256)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No products match “{search}”.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((p) => (
                        <TableRow key={p.serial}>
                          <TableCell className="font-medium">
                            {p.serial}
                          </TableCell>
                          <TableCell>{p.sku}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {p.manufactured_at}
                          </TableCell>
                          <TableCell>
                            <HashDisplay value={p.leaf} lead={8} tail={6} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Hashing pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                Hashing pipeline (first product)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HashFlow
                product={batch.products[0]}
                encoded={batch.products[0].encoded}
                leaf={batch.products[0].leaf}
              />
            </CardContent>
          </Card>

          {/* Step 2 — Build tree */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Step 2 · Build the Merkle Tree
              </CardTitle>
              <CardDescription>
                Combine leaves pairwise (sorted) up to a single 32-byte root.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="secondary"
                onClick={onBuildTree}
                disabled={busy !== null}
              >
                {busy === "tree" ? <Spinner /> : <Layers />}
                {busy === "tree" ? "Building…" : "Generate Merkle Tree"}
              </Button>
              {tree && (
                <>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-muted-foreground">Merkle Root</span>
                      <HashDisplay value={tree.merkleRoot} lead={12} tail={10} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Depth {tree.depth} levels · this single root commits to all{" "}
                      {batch.totalProducts} products.
                    </p>
                  </div>
                  <MerkleTreeView levels={tree.levels} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 3 — Register on-chain */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Anchor className="h-4 w-4 text-muted-foreground" />
                Step 3 · Register the root on Ethereum
              </CardTitle>
              <CardDescription>
                Sends one transaction; only the 32-byte root is stored on-chain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button disabled={busy !== null}>
                    {busy === "register" ? <Spinner /> : <Anchor />}
                    {busy === "register"
                      ? "Sending transaction…"
                      : "Register Root On-Chain"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anchor Merkle root on-chain?</DialogTitle>
                    <DialogDescription>
                      This sends a transaction to the ProductRegistry contract
                      and consumes gas. It commits the root for{" "}
                      <span className="font-medium">{batchId}</span>.
                      {!chain?.connected && (
                        <span className="mt-2 flex items-center gap-1.5 text-warning">
                          <ShieldAlert className="h-4 w-4" />
                          Chain appears offline — this may fail.
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={onRegister}>
                      <Anchor />
                      Confirm & Register
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {registered && (
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="success">Anchored</Badge>
                    <span className="text-sm text-muted-foreground">
                      Root committed on-chain
                    </span>
                  </div>
                  <div className="divide-y">
                    <DetailRow label="Merkle Root">
                      <HashDisplay value={registered.merkleRoot} />
                    </DetailRow>
                    <DetailRow label="Contract">
                      <HashDisplay value={registered.onChain.contractAddress} />
                    </DetailRow>
                    <DetailRow label="Tx Hash">
                      <HashDisplay value={registered.onChain.txHash} />
                    </DetailRow>
                    <DetailRow label="Block">
                      {registered.onChain.blockNumber}
                    </DetailRow>
                    <DetailRow label="Gas Used">
                      {registered.onChain.gasUsed.toLocaleString()}
                    </DetailRow>
                    <DetailRow label="Registered By">
                      <HashDisplay value={registered.onChain.registeredBy} />
                    </DetailRow>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
