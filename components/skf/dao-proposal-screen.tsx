'use client';

import Link from 'next/link';
import { Scale, Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getDaoProposal, getDealerByDid, formatRelativeTime } from '@/lib/store/provenance';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { ProvenanceFooter } from '@/components/panels/ProvenanceFooter';

interface DaoProposalScreenProps {
  proposalId: string;
}

export function DaoProposalScreen({ proposalId }: DaoProposalScreenProps) {
  const proposal = getDaoProposal(proposalId);
  const dealer = proposal ? getDealerByDid(proposal.dealer_did) : undefined;

  if (!proposal) {
    return (
      <div className="ds-page">
        <div className="ds-page-inner-wide">
          <h1 className="ds-title">Proposal not found</h1>
          <Link href="/governance" className="text-sm text-primary hover:underline mt-2 inline-block">Back to governance</Link>
        </div>
      </div>
    );
  }

  const totalVotes = proposal.votes.for + proposal.votes.against + proposal.votes.abstain;
  const pctFor = totalVotes ? Math.round((proposal.votes.for / totalVotes) * 100) : 0;

  return (
    <div className="ds-page">
      <div className="ds-page-inner-wide ds-stack max-w-4xl">
        <PageHeader
          icon={Scale}
          title={proposal.proposal_id}
          subtitle={`${proposal.action_type} · ${proposal.governance.replace(/_/g, ' ')}`}
          action={
            <Link href="/channel-governance/dealers" className="ds-btn-sm ds-btn-outline">
              <Shield size={14} /> Dealer console
            </Link>
          }
        />

        <div className="ds-card ds-card-body space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={proposal.status} />
            <StatusBadge status={proposal.action_type} />
            {dealer && <StatusBadge status={dealer.status} />}
          </div>

          <div>
            <p className="ds-overline">Dealer</p>
            <p className="text-sm font-medium mt-1">{dealer?.display_name ?? proposal.dealer_did}</p>
          </div>

          <div>
            <p className="ds-overline">Rationale</p>
            <p className="text-sm mt-1 leading-relaxed">{proposal.rationale}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="ds-overline">Opened</p><p className="mt-1">{formatRelativeTime(proposal.opened_at)}</p></div>
            <div><p className="ds-overline">Closes</p><p className="mt-1">{formatRelativeTime(proposal.closes_at)}</p></div>
            <div><p className="ds-overline">Votes for</p><p className="mt-1 font-semibold">{proposal.votes.for} ({pctFor}%)</p></div>
            <div><p className="ds-overline">Quorum</p><p className="mt-1">{proposal.votes.quorum_required}</p></div>
          </div>

          {proposal.on_chain_tx && (
            <div>
              <p className="ds-overline">On-chain tx</p>
              <p className="font-mono text-xs mt-1 text-primary">{proposal.on_chain_tx}</p>
            </div>
          )}

          <ProvenanceFooter feature="dao__proposal__detail" />
        </div>
      </div>
    </div>
  );
}
