import { Link2, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { shortHash, type ChainStatus } from "@/api/client";

/** Compact on-chain connection indicator with a details tooltip. */
export function ChainStatusBadge({ chain }: { chain: ChainStatus | null }) {
  if (!chain) {
    return (
      <Badge variant="outline" className="gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
        Checking…
      </Badge>
    );
  }
  const connected = chain.connected;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={connected ? "success" : "warning"}
          className="cursor-default gap-1"
        >
          {connected ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <Link2Off className="h-3 w-3" />
          )}
          {connected ? "On-chain" : "Offline"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {connected ? (
          <div className="space-y-0.5 text-xs">
            <div>RPC: {chain.rpcUrl}</div>
            <div>Contract: {shortHash(chain.contractAddress ?? "", 8, 6)}</div>
            <div>Accounts: {chain.accounts?.length ?? 0}</div>
          </div>
        ) : (
          <div className="max-w-[16rem] text-xs">
            Blockchain not connected — off-chain verification still works.
            {chain.error ? ` (${chain.error})` : ""}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
