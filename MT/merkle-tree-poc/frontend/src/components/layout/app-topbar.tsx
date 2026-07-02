import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { SettingsSheet } from "@/components/settings-sheet";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import { NavLinks } from "./nav-links";
import { Brand } from "./brand";
import { navItemForPath } from "@/lib/nav";
import type { ChainStatus } from "@/api/client";

/** Sticky top bar: mobile nav trigger, breadcrumb, chain status, theme toggle. */
export function AppTopbar({ chain }: { chain: ChainStatus | null }) {
  const { pathname } = useLocation();
  const current = navItemForPath(pathname);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="flex h-16 flex-row items-center border-b px-5">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
          </SheetHeader>
          <div className="px-3 py-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Merkle</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{current?.label ?? "—"}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ChainStatusBadge chain={chain} />
        <Separator orientation="vertical" className="h-6" />
        <SettingsSheet />
        <ModeToggle />
      </div>
    </header>
  );
}
