import { useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { getApiKey, setApiKey } from "@/api/client";

/** Settings panel: API key for protected (mutating / on-chain) endpoints. */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(() => getApiKey());

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            API key for protected endpoints (batch register, on-chain verify,
            tamper). Leave empty for a local dev backend.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apikey">API key</Label>
            <Input
              id="apikey"
              type="password"
              autoComplete="off"
              placeholder="Bearer token (optional in dev)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sent as <code className="hash-mono">Authorization: Bearer …</code>{" "}
              on protected calls. Stored only in this browser (localStorage).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setApiKey(key.trim());
                toast.success("Settings saved");
                setOpen(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setKey("");
                setApiKey("");
                toast.success("API key cleared");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
