import { Waypoints } from "lucide-react";

/** Product wordmark + logo used in the sidebar and mobile nav. */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Waypoints className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">VoltusWave</div>
        <div className="text-xs text-muted-foreground">Merkle Registry</div>
      </div>
    </div>
  );
}
