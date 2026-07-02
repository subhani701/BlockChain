import { Brand } from "./brand";
import { NavLinks } from "./nav-links";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Desktop left sidebar (hidden on mobile — replaced by the topbar Sheet). */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/40 md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Brand />
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <NavLinks />
      </ScrollArea>
      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        Anti-counterfeit provenance
      </div>
    </aside>
  );
}
