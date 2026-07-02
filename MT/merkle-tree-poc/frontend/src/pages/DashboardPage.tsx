import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Boxes,
  Package,
  Blocks,
  Cpu,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Fuel
} from "lucide-react";
import { toast } from "sonner";
import { api, type OnChainInfo } from "@/api/client";
import type { AppCtx } from "@/App";
import { PageHeader } from "@/components/page-header";
import { HashDisplay } from "@/components/hash-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface BatchSummary {
  batchId: string;
  totalProducts: number;
  merkleRoot: string | null;
  onChain: OnChainInfo | null;
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="font-medium">{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { chain } = useOutletContext<AppCtx>();
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (announce = false) => {
    setRefreshing(true);
    setError(null);
    try {
      const list = await api.listBatches();
      setBatches(list);
      if (announce) toast.success("Dashboard refreshed");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalProducts = (batches ?? []).reduce(
    (s, b) => s + b.totalProducts,
    0
  );
  const anchored = (batches ?? []).filter((b) => b.onChain).length;
  const total = batches?.length ?? 0;
  const anchoredPct = total > 0 ? Math.round((anchored / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of batches, anchored roots, and network status"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={refreshing ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/generate">
                <PlusCircle />
                New batch
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Couldn't load batches</AlertTitle>
          <AlertDescription>
            {error} — is the backend running on the configured API base?
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {batches === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] w-full" />
          ))
        ) : (
          <>
            <StatCard label="Total Batches" value={total} icon={Boxes} />
            <StatCard
              label="Total Products"
              value={totalProducts.toLocaleString()}
              icon={Package}
            />
            <StatCard
              label="Anchored Roots"
              value={`${anchored}/${total}`}
              icon={Blocks}
              hint={`${anchoredPct}% committed on-chain`}
            />
            <StatCard
              label="Network"
              value={chain?.connected ? "Connected" : "Offline"}
              icon={Cpu}
              hint={
                chain?.connected
                  ? `${chain.accounts?.length ?? 0} accounts`
                  : "off-chain mode"
              }
            />
          </>
        )}
      </div>

      {/* Anchoring progress + contract info */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Anchoring progress</CardTitle>
            <CardDescription>
              Batches whose Merkle root is committed on-chain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {anchored} of {total} anchored
              </span>
              <span className="font-medium">{anchoredPct}%</span>
            </div>
            <Progress value={anchoredPct} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract</CardTitle>
            <CardDescription>ProductRegistry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Address</span>
              <HashDisplay value={chain?.contractAddress} lead={8} tail={6} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Registrar</span>
              <HashDisplay value={chain?.accounts?.[0]} lead={8} tail={6} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={chain?.connected ? "success" : "warning"}>
                {chain?.connected ? "Connected" : "Offline"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Batches</CardTitle>
          <CardDescription>
            All generated batches and their anchoring status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batches === null ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Boxes className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No batches yet</p>
                <p className="text-sm text-muted-foreground">
                  Generate your first batch to build a Merkle tree.
                </p>
              </div>
              <Button asChild>
                <Link to="/generate">
                  <PlusCircle />
                  Generate a batch
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Merkle Root</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Gas</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.batchId}>
                    <TableCell className="font-medium">{b.batchId}</TableCell>
                    <TableCell>{b.totalProducts}</TableCell>
                    <TableCell>
                      <HashDisplay value={b.merkleRoot} />
                    </TableCell>
                    <TableCell>
                      {b.onChain ? (
                        <Badge variant="success" className="gap-1">
                          <Blocks className="h-3 w-3" />
                          Anchored
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {b.onChain ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Fuel className="h-3.5 w-3.5" />
                          {b.onChain.gasUsed.toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/verify">
                          <ShieldCheck />
                          Verify
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
