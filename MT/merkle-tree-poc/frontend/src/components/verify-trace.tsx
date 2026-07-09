/**
 * frontend/src/components/verify-trace.tsx
 * -----------------------------------------------------------------------------
 * Shared "verification trace" — the step-by-step view of what a verification
 * actually does: recompute the leaf, climb the proof, read the on-chain root,
 * compare. Used by both the operator Verify page and the QR Field Verify page so
 * the two surfaces look and behave identically.
 * -----------------------------------------------------------------------------
 */
import { CircleCheck, CircleX, ShieldAlert, Terminal } from "lucide-react";
import { Spinner } from "@/components/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export type StepStatus = "running" | "done" | "fail" | "warn" | "skip";

export interface Step {
  label: string;
  value?: string;
  status: StepStatus;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reveal `built` steps one at a time via `setSteps` — each step first shows a
 * spinner, then resolves to its real status. Makes an instant local computation
 * visible as a paced process.
 */
export async function revealSteps(
  built: Step[],
  setSteps: (s: Step[]) => void
): Promise<void> {
  for (let i = 0; i < built.length; i++) {
    setSteps([...built.slice(0, i), { ...built[i], status: "running" }]);
    await sleep(420);
    setSteps(built.slice(0, i + 1));
    await sleep(140);
  }
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Spinner />;
  if (status === "done") return <CircleCheck className="h-4 w-4 text-success" />;
  if (status === "fail") return <CircleX className="h-4 w-4 text-destructive" />;
  if (status === "warn") return <ShieldAlert className="h-4 w-4 text-warning" />;
  return (
    <span className="inline-block h-4 w-4 text-center text-muted-foreground">
      –
    </span>
  );
}

export function VerifyTrace({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          Verification trace
        </CardTitle>
        <CardDescription>
          Recompute the leaf, climb the proof, then compare to the root read from
          the blockchain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5">
              <StepIcon status={s.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm">{s.label}</div>
              {s.value && (
                <div className="hash-mono break-all text-xs text-muted-foreground">
                  {s.value}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
