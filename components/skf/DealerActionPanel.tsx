'use client';

import { useState } from 'react';
import { Gavel } from 'lucide-react';
import Link from 'next/link';
import { openDaoProposal, addEnforcementEvent, setSelectedDealerStatus } from '@/lib/store/provenance';
import type { DaoActionType } from '@/lib/store/types';
import { useApp } from '@/components/providers/app-provider';
import type { Dealer } from '@/lib/store/types';

const ACTIONS: { id: DaoActionType; label: string; governance: 'single_signer' | 'dao_simple_majority' | 'dao_super_majority'; ttl_hours?: number }[] = [
  { id: 'WARN', label: 'Formal warning', governance: 'single_signer' },
  { id: 'SUSPEND', label: 'Suspend (90 days)', governance: 'dao_simple_majority', ttl_hours: 336 },
  { id: 'BLACKLIST', label: 'Blacklist permanently', governance: 'dao_super_majority', ttl_hours: 336 },
  { id: 'REINSTATE', label: 'Reinstate', governance: 'dao_simple_majority', ttl_hours: 168 },
];

interface DealerActionPanelProps {
  dealer: Dealer;
  onAction?: () => void;
}

export function DealerActionPanel({ dealer, onAction }: DealerActionPanelProps) {
  const { showToast } = useApp();
  const [action, setAction] = useState<DaoActionType>('WARN');
  const [rationale, setRationale] = useState('');

  const visibleActions = ACTIONS.filter((a) => {
    if (a.id === 'REINSTATE') return ['Warned', 'Suspended'].includes(dealer.status);
    return true;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rationale.length < 80) {
      showToast('Rationale must be at least 80 characters', 'warning');
      return;
    }
    const selected = ACTIONS.find((a) => a.id === action)!;
    const proposal = openDaoProposal({
      dealer_did: dealer.did,
      action_type: action,
      governance: selected.governance,
      rationale,
      evidence_hash: `0xevid…${Date.now().toString(16).slice(-4)}`,
      ttl_hours: selected.ttl_hours,
    });

    if (action === 'WARN' && selected.governance === 'single_signer') {
      setSelectedDealerStatus(dealer.did, 'Warned');
      addEnforcementEvent({
        dealer_did: dealer.did,
        type: 'WARN',
        occurred_at: new Date().toISOString(),
        actor: 'did:voltus:oem:brand-protection',
        dao_proposal_ref: proposal.proposal_id,
        on_chain_tx: '0xwarn…pending',
        rationale_short: rationale.slice(0, 80),
      });
    }

    const hours = Math.round((new Date(proposal.closes_at).getTime() - Date.now()) / (1000 * 60 * 60));
    showToast(`Proposal opened. DAO voting closes in ${hours}h. Proposal ID: ${proposal.proposal_id}`, 'success');
    onAction?.();
  };

  return (
    <form onSubmit={submit} className="ds-card">
      <div className="ds-card-header flex items-center gap-2.5">
        <span className="ds-card-icon"><Gavel size={16} strokeWidth={1.75} /></span>
        <h3 className="ds-section-title mb-0">Action</h3>
      </div>
      <div className="ds-card-body space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {visibleActions.map((a) => (
            <button key={a.id} type="button" onClick={() => setAction(a.id)}
              className={`ds-select-card ${action === a.id ? 'ds-select-card-active' : ''}`}>
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.governance.replace(/_/g, ' ')}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="ds-form-field">
          <label className="ds-form-label">Rationale (on-chain proposal) *</label>
          <textarea className="ds-form-textarea min-h-[100px]" value={rationale} onChange={(e) => setRationale(e.target.value)} required minLength={80} />
          <p className="text-xs text-muted-foreground">{rationale.length}/80 min characters</p>
        </div>
        <div className="ds-info-banner ds-info-banner-blue text-xs">
          Evidence pack will be signed by OEM DID and attached to the proposal.
        </div>
        <div className="ds-actions-split">
          <Link href={`/authenticity-reports?dealer_did=${encodeURIComponent(dealer.did)}`} className="ds-btn-md ds-btn-outline">
            View evidence reports
          </Link>
          <button type="submit" className="ds-btn-md ds-btn-primary">Open DAO proposal</button>
        </div>
      </div>
    </form>
  );
}
