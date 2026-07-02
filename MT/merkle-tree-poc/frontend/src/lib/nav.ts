import {
  LayoutDashboard,
  Boxes,
  GitBranch,
  ShieldCheck,
  ScanLine,
  BookOpen,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Single source of truth for sidebar nav + breadcrumbs + page titles. */
export const NAV: NavItem[] = [
  {
    path: "/",
    label: "Dashboard",
    description: "Overview of batches, roots, and verifications",
    icon: LayoutDashboard
  },
  {
    path: "/generate",
    label: "Batch & Tree",
    description: "Generate a batch, build the Merkle tree, anchor the root",
    icon: Boxes
  },
  {
    path: "/proof",
    label: "Proof",
    description: "Generate a Merkle proof and visualize the path",
    icon: GitBranch
  },
  {
    path: "/verify",
    label: "Verify & Tamper",
    description: "Verify a product on-chain and run the tampering demo",
    icon: ShieldCheck
  },
  {
    path: "/field-verify",
    label: "Field Verify",
    description: "Scan a product QR and verify it offline against the on-chain root",
    icon: ScanLine
  },
  {
    path: "/learn",
    label: "Learn",
    description: "How Merkle proofs secure product provenance",
    icon: BookOpen
  }
];

/** Look up the nav item for a pathname (exact match, "/" for index). */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV.find((n) => n.path === pathname);
}
