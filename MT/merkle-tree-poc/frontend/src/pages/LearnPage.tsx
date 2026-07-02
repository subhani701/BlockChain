/**
 * Learn — concept reference for the Merkle provenance model.
 */
import { Lightbulb, BookOpen, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const GLOSSARY: { term: string; body: React.ReactNode }[] = [
  {
    term: "Hash",
    body: (
      <>
        A one-way function turning any data into a fixed-size fingerprint.
        Change one bit → a totally different output (the avalanche effect).
      </>
    )
  },
  {
    term: "keccak256",
    body: (
      <>
        The hash function Ethereum uses (a variant of SHA-3). Our leaf is a{" "}
        <em>double</em> hash of the canonical JSON —{" "}
        <code className="hash-mono">
          keccak256(keccak256(JSON&#123;serial,sku,batch_id,manufactured_at&#125;))
        </code>{" "}
        — computed identically off-chain and on-chain.
      </>
    )
  },
  {
    term: "Merkle Tree",
    body: (
      <>
        A binary tree of hashes. Leaves are product hashes; each parent is the
        hash of its two (sorted) children; the single top node is the root.
      </>
    )
  },
  {
    term: "Merkle Root",
    body: (
      <>
        One 32-byte hash that uniquely represents the whole batch. Only this is
        stored on-chain — O(1) regardless of batch size.
      </>
    )
  },
  {
    term: "Merkle Proof",
    body: (
      <>
        The ~log₂(n) sibling hashes needed to rebuild the root from one leaf.
        Proves membership without revealing the other products.
      </>
    )
  }
];

export function LearnPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Learn"
        description="How Merkle proofs secure product provenance"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            The big idea
          </CardTitle>
          <CardDescription>
            One 32-byte fingerprint commits to an entire batch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A manufacturer makes thousands of products. Putting each one on
            Ethereum would be extremely expensive. Instead we compute a single
            32-byte fingerprint — the <strong>Merkle Root</strong> — that commits
            to the entire batch, and store only that on-chain.
          </p>
          <pre className="hash-mono overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">
{`Products  →  Leaf Hashes  →  Parent Hashes  →  Merkle Root  →  Ethereum
 (many)       keccak256×2      keccak256         32 bytes        O(1) storage`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Glossary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="Merkle Root">
            {GLOSSARY.map((g) => (
              <AccordionItem key={g.term} value={g.term}>
                <AccordionTrigger>{g.term}</AccordionTrigger>
                <AccordionContent>{g.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Why tampering is caught
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verification recomputes the root from your product's leaf + proof and
            compares it to the stored root. Alter any field and the leaf changes
            completely, so the recomputed root no longer matches — the product is
            rejected as counterfeit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
