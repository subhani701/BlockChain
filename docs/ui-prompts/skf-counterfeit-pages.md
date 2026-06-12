# SKF Counterfeit Provenance — UI Prompts

**Target app:** VoltusWave AMI (block-chain-voltusai.vercel.app)  
**Status:** Implemented v1  
**DSL:** Voltus Process Intelligence UI Prompt format

## Implementation map

| Spec route | App route |
|---|---|
| Service Request Authenticity Check | `/service-requests/[srId]/authenticity` |
| Open Service Requests (list) | `/service-requests` |
| Authenticity Reports (list) | `/authenticity-reports` |
| Dealer Authorization & Blacklist Console | `/channel-governance/dealers` |
| DAO Proposal detail | `/dao/proposals/[proposalId]` |

## Store

- Types: `lib/store/types.ts`
- Seed: `lib/store/seed.skf.ts`
- Queries & mutations: `lib/store/provenance.ts`

## Shared components

- `components/badges/StatusBadge.tsx`
- `components/panels/` — KpiTile, KpiGrid, AttributionCard, TimelineList, ProvenanceFooter, PanelEmptyState
- `components/skf/` — screen implementations and forms

## Navigation (Section 0.1)

- **Service Operations** — Open Service Requests, Authenticity Reports
- **Channel Governance** — Dealer Authorization & Blacklist, DAO Proposals → Governance

## Cross-page state

`useDealerSelection()` in `app-provider` — selected dealer persists across drill-out / drill-back.
