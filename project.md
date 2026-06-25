# VoltusWave AMI — Complete Project Documentation

Everything about this project in one place: what it is, why it exists, the architecture, every
folder and file, the data model, the screens, the state management, the build/run instructions,
and how it relates to the companion docs (`blockchain.md`, `merkle.md`, `chains.md`).

> **One-line summary**
> A **Next.js 16 / React 19** front-end that *simulates* an enterprise **anti-counterfeit +
> aftermarket-intelligence platform** for **SKF** (a bearing manufacturer). It's a polished UI
> demo — all data is in-memory mock data; the "blockchain" is themed, not real.

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [The Product Vision](#2-the-product-vision)
3. [Tech Stack](#3-tech-stack)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Folder-by-Folder Map](#5-folder-by-folder-map)
6. [Routing & Navigation](#6-routing--navigation)
7. [The Two Data Layers](#7-the-two-data-layers)
8. [The Data Model](#8-the-data-model)
9. [State Management (the Provider)](#9-state-management-the-provider)
10. [The Screens (Every One)](#10-the-screens-every-one)
11. [The Core Flow: Counterfeit → DAO](#11-the-core-flow-counterfeit--dao)
12. [Design System & Styling](#12-design-system--styling)
13. [Build, Run & Deploy](#13-build-run--deploy)
14. [What's Real vs Simulated](#14-whats-real-vs-simulated)
15. [Glossary & Companion Docs](#15-glossary--companion-docs)

---

## 1. What This Project Is

| | |
|---|---|
| **Name** | VoltusWave AMI — Aftermarket Intelligence Platform |
| **Customer/domain** | SKF (industrial bearings) — anti-counterfeit & aftermarket sales |
| **Type** | Front-end web application (UI prototype / demo) |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Data** | In-memory mock data (no backend, no database, no real chain) |
| **Origin** | Scaffolded with `v0.app` (`generator: 'v0.app'` in metadata) |
| **Deploy target** | Vercel (`block-chain-voltusai.vercel.app` per the docs) |
| **Tagline** | *"Provenance as a Demand Sensor — turning every part scan into a predictive aftermarket signal."* |

It is **not** a smart-contract project, **not** a backend service, and contains **no tests or CI**.
It is a design-complete, click-through front end.

---

## 2. The Product Vision

The app blends **two intertwined ideas**:

1. **Anti-counterfeit (provenance):** every genuine SKF part has a tamper-proof history
   (factory → distributor → dealer → service centre → customer). When a technician scans a part,
   the system verifies it against that history. Fakes are caught, the responsible dealer is scored,
   and a **DAO votes** to punish bad dealers (warn → suspend → blacklist).

2. **Aftermarket intelligence (demand sensing):** every scan is also a **sales signal**. Knowing
   which parts are installed where (the "install base") drives account intelligence, seller
   worklists, and quote generation. Provenance data becomes a **demand sensor**.

The UI is organized into **phases** (1–4) plus two governance sections, reflecting a phased rollout
of these capabilities.

---

## 3. Tech Stack

| Layer | Tool | Version | Role |
|---|---|---|---|
| Language | TypeScript | 5.7 | Typed JavaScript |
| UI library | React | 19.2 | Component model |
| Framework | Next.js (App Router) | 16.2 | Routing, layouts, rendering |
| Styling | Tailwind CSS | 4.2 | Utility-class styling |
| UI primitives | shadcn + Base UI (`@base-ui/react`) | — | Buttons, popovers, badges |
| Animation | Framer Motion | 12 | Page/element transitions, toasts |
| Charts | Recharts | 3.8 | Dashboard graphs |
| Icons | lucide-react | 1.16 | SVG icon set |
| Utilities | clsx, tailwind-merge, class-variance-authority | — | Class composition / variants |
| Analytics | @vercel/analytics | 1.6 | Page-view tracking (prod only) |
| Fonts | `next/font` → Inter | — | Typeface |

**Config files:**
- `tsconfig.json` — strict TS, path alias `@/* → ./*`, `moduleResolution: bundler`.
- `next.config.mjs` — **`typescript.ignoreBuildErrors: true`** (builds even with TS errors — a demo
  convenience) and `images.unoptimized: true`.
- `components.json` — shadcn config (style `base-nova`, base color `neutral`, lucide icons).
- `postcss.config.mjs` — Tailwind v4 via `@tailwindcss/postcss`.
- Two lockfiles coexist: `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm).

---

## 4. High-Level Architecture

```
Browser
  │
  ▼
app/layout.tsx          → <html>, Inter font, theme-init script, Vercel Analytics
  │
  ▼
app/(app)/layout.tsx    → wraps everything in <AppProvider> + <AppShell>
  │                          AppProvider  = global state (context)
  │                          AppShell     = sidebar + header + page transitions
  ▼
app/(app)/<route>/page.tsx   → a thin page that renders a "screen" component
  │
  ▼
components/screens/* or components/skf/*   → the actual UI for that screen
  │
  ▼
lib/store/* and lib/data/*   → mock data + query/mutation functions ("the API")
```

**The golden rule:** every screen is `URL → layout → provider → shell → page → screen → data`.
Learn that chain once and the whole repo is legible.

---

## 5. Folder-by-Folder Map

```
BlockChain/
├── app/                                  # Next.js App Router (folders = URLs)
│   ├── layout.tsx                        # root html, font, theme init, analytics
│   ├── globals.css                       # Tailwind import + design tokens + ds-* classes
│   └── (app)/                            # route group (no URL segment)
│       ├── layout.tsx                    # <AppProvider> + <AppShell>
│       ├── page.tsx                      # "/" — home dashboard
│       ├── field-verify/page.tsx         # mobile QR scan screen (full-bleed)
│       ├── batch-minting/page.tsx
│       ├── provenance-registry/page.tsx
│       ├── install-base/page.tsx
│       ├── channel-map/page.tsx
│       ├── account/page.tsx
│       ├── account/[customerId]/page.tsx          # dynamic
│       ├── seller-worklist/page.tsx
│       ├── quote/page.tsx
│       ├── quote/[quoteId]/page.tsx               # dynamic
│       ├── governance/page.tsx
│       ├── service-requests/page.tsx
│       ├── service-requests/[srId]/authenticity/page.tsx   # dynamic
│       ├── authenticity-reports/page.tsx
│       ├── channel-governance/dealers/page.tsx
│       └── dao/proposals/[proposalId]/page.tsx    # dynamic
│
├── components/
│   ├── app-shell.tsx                     # sidebar + header frame, theme toggle
│   ├── home-dashboard.tsx                # the "/" content
│   ├── header-notifications.tsx          # bell + alert count
│   ├── providers/app-provider.tsx        # ALL global state + toasts (context)
│   ├── screens/                          # AMI screens (field-verify, channel-map, quote, etc.)
│   ├── skf/                              # counterfeit/provenance feature (SRs, reports, DAO, dealers)
│   ├── panels/                           # KpiTile, AttributionCard, TimelineList, ProvenanceFooter…
│   ├── ui/                               # button, page-header, page-search (shadcn-style)
│   ├── ui-ami/                           # KPI cards, data tables, charts, badges, popovers
│   └── badges/StatusBadge.tsx            # colored status pills
│
├── lib/
│   ├── navigation.ts                     # route registry + nav groups + path helpers
│   ├── motion.ts                         # framer-motion transition presets
│   ├── design.ts                         # design tokens / helpers
│   ├── utils.ts                          # cn() class merger, misc
│   ├── provenance-admin-roles.ts         # role options for the registry screen
│   ├── store/                            # DATA LAYER 1 — SKF counterfeit feature
│   │   ├── types.ts                      #   all data shapes
│   │   ├── seed.skf.ts                   #   the mock records
│   │   └── provenance.ts                 #   queries + mutations
│   └── data/
│       ├── ami-data.ts                   # DATA LAYER 2 — AMI platform (batches, scans, identities…)
│       └── customer-map.ts               # customer geo/map data
│
├── docs/ui-prompts/skf-counterfeit-pages.md   # original spec for the SKF feature
├── blockchain.md  merkle.md  chains.md        # the learning companion docs
├── package.json  tsconfig.json  next.config.mjs  postcss.config.mjs  components.json
└── package-lock.json  pnpm-lock.yaml
```

---

## 6. Routing & Navigation

- **App Router**: folders under `app/(app)/` become URLs. `(app)` is a *route group* — the
  parentheses organize files **without** adding a URL segment.
- **Dynamic routes** use brackets: `[customerId]`, `[quoteId]`, `[srId]`, `[proposalId]`.
- **`lib/navigation.ts`** is the single source of truth for navigation:
  - `ROUTES` — typed URL builders (e.g. `ROUTES.daoProposal(id)`).
  - `navGroups` — the sidebar structure grouped by **phase**.
  - `getNavItemForPath()` — maps a URL back to its nav item (handles dynamic routes).
  - `getPageTransitionKey()` — keeps page transitions stable across dynamic-segment changes.
  - `legacyPathForScreen()` — bridges old screen ids to new routes.

**The sidebar groups (from `navGroups`):**

| Group | Items |
|---|---|
| Home | Dashboard |
| Phase 1 | Field Verify & Scan · Batch Minting Console · Provenance Registry |
| Phase 2 | Install-Base Census · Channel Integrity Map |
| Phase 3 | Account Intelligence · Seller Worklist · Quote Workbench |
| Phase 4 | Governance & Audit |
| Service Operations | Open Service Requests · Authenticity Reports |
| Channel Governance | Dealer Authorization & Blacklist · DAO Proposals |

Nav items carry a `tier` (`mobile` / `desktop` / `admin`); admin items show a small lock icon.

---

## 7. The Two Data Layers

There are **two independent mock "databases"**, reflecting the app's two halves:

### Layer 1 — `lib/store/` (SKF Counterfeit feature)
The newest, most self-contained feature. Plain functions over a single in-memory object.
- `types.ts` — shapes (Dealer, ServiceRequest, CounterfeitReport, DaoProposal, CustodyEvent…).
- `seed.skf.ts` — the records (5 dealers, 12 reports, custody chains, DAO proposals, signal scores).
- `provenance.ts` — `getServiceRequests()`, `scanServiceRequest()`, `fileCounterfeitReport()`,
  `getDealerLeaderboard()`, `openDaoProposal()`, etc. Holds `let store = structuredClone(skfSeed)`.

### Layer 2 — `lib/data/ami-data.ts` (the broader AMI platform)
Powers the Phase 1–4 screens and the runtime provider. Exposes batches, scans, identities,
channel-integrity alerts, decision traces, anchoring, and provenance-registry logic
(`anchorBatch`, `mergeBatch`, `createSuspectScanFromFieldVerify`, `hasMintRightsForDid`, …).

> **Note:** Layer 1 is mostly *pure functions* (call them directly in a screen). Layer 2 is wired
> through React state in the **AppProvider** so its data is *runtime-mutable* and shared across
> pages (e.g. anchoring a batch updates the dashboard and the audit trail live).

---

## 8. The Data Model

The SKF store (`lib/store/types.ts`) is the clearest model to learn:

```ts
interface SkfStore {
  serviceRequests:      ServiceRequest[]
  counterfeitReports:   CounterfeitReport[]
  dealers:              Dealer[]
  dealerEnforcementLog: EnforcementEvent[]
  daoProposals:         DaoProposal[]
  products:             Record<string, Product>
  custodyChains:        Record<string, CustodyEvent[]>
  dealerSignalScores:   Record<string, { score: number; attributions: DealerSignalAttribution[] }>
}
```

**The status ladders (string unions):**
```
DealerStatus:       Authorized → Under review → Warned → Suspended → Blacklisted
VerificationResult: AUTHENTIC | COUNTERFEIT | CANNOT_VERIFY | NOT_YET_SCANNED
ReportSeverity:     SUSPECTED → CONFIRMED_VISUAL → CONFIRMED_LAB
ReportStatus:       Submitted → Under review → Confirmed | Dismissed
EnforcementType:    WARN | SUSPEND | REINSTATE | BLACKLIST | APPEAL
DaoActionType:      WARN | SUSPEND | BLACKLIST | REINSTATE
DaoGovernance:      single_signer | dao_simple_majority | dao_super_majority
DaoProposalStatus:  Open → Passed | Failed → Executed | Cancelled
CustodyRole:        PLANT → DISTRIBUTOR → DEALER → SERVICE_CENTRE → CUSTOMER
```

**The 5 seed dealers double as the 5 stages of the punishment ladder:**

| Dealer | Status | Signal score |
|---|---|---|
| Nordic Bearing Supply AB | Authorized | 8 |
| Autohaus Müller GmbH | Under review | 34 |
| Eastern Motors Parts | Warned | 78 (live SUSPEND vote open) |
| Midlands Industrial Supply | Suspended | 91 |
| Grey Channel Trading Ltd | Blacklisted | 100 |

**Verification logic** (`scanServiceRequest` in `provenance.ts`) runs **7 weighted checks** —
merkle_proof_valid (0.2), root_anchored_on_chain (0.15), batch_active (0.1), dealer_authorized
(0.2), custody_continuous (0.15), qr_not_replayed (0.1), region_consistent (0.1) — and decides
AUTHENTIC / COUNTERFEIT / CANNOT_VERIFY. (See `merkle.md` for making the merkle check real.)

---

## 9. State Management (the Provider)

`components/providers/app-provider.tsx` is the **brain** of the app — a single React Context that
holds all cross-page state and exposes typed hooks. It's a `'use client'` component.

**What it holds:**
- **UI state:** `isDark` (theme, persisted to `localStorage` as `voltus-theme`), `sidebarOpen`,
  `sidebarCollapsed` (persisted), a **toast** notification system (max 5, auto-dismiss 4.2s).
- **Navigation helpers:** `navigateTo`, `goToCustomer`, `goToQuote` (push routes + show toasts).
- **Cross-page selections:** `selectedCustomerId`, `selectedDealerDid` (persists across drill-in /
  drill-out), `quoteContext`.
- **Runtime AMI state:** `runtimeScans`, `runtimeBatchAnchors`, `runtimeDecisionTraces`,
  provenance identities/credentials/proposal-status overrides, `mintGrantedDids`,
  `provenanceAdminRole`.
- **Actions:** `raiseChannelIntegrityAlert`, `anchorBatch`, `releaseQuote`,
  `registerProvenanceIdentity`, `issueProvenanceVc`, `approveDaoProposal`, `rejectDaoProposal`, …

**Convenience hooks (selectors over the context):**
`useApp`, `useScreenCallbacks`, `useChannelIntegrity`, `useBatchAnchoring`, `useDealerSelection`,
`useProvenanceRegistry`, `useProvenanceAdminRole`.

> **Worth noting:** the action functions contain comments hinting at the *intended real backend*,
> e.g. `anchorBatch()` → "ProvenanceRegistry.sol on Voltus Private Ethereum; DID/VC signing + DAO
> check precede tx", and `releaseQuote()` → "SAP SD BAPI_QUOTATION_CREATE / OData SalesQuote API".
> These comments are the bridge from this demo to a real system (see `chains.md` & `blockchain.md`).

---

## 10. The Screens (Every One)

| Screen | Route | Component | Purpose |
|---|---|---|---|
| Home Dashboard | `/` | `home-dashboard.tsx` | KPIs, alerts, entry points |
| Field Verify & Scan | `/field-verify` | `screens/field-verify-screen` | Mobile QR scan (full-bleed, no header) |
| Batch Minting Console | `/batch-minting` | `screens/batch-minting-screen` | Mint/anchor part batches |
| Provenance Registry | `/provenance-registry` | `screens/provenance-registry-screen` | DID/VC identity admin (role-gated) |
| Install-Base Census | `/install-base` | `screens/install-base-screen` | Where parts are installed |
| Channel Integrity Map | `/channel-map` | `screens/channel-map-screen` | Geographic counterfeit/alert map |
| Account Intelligence | `/account`, `/account/[customerId]` | `screens/account-wiki-screen` | Customer 360 |
| Seller Worklist | `/seller-worklist` | `screens/seller-worklist-screen` | Prioritized sales tasks |
| Quote Workbench | `/quote`, `/quote/[quoteId]` | `screens/quote-workbench-screen` | Guided pricing / win-probability |
| Governance & Audit | `/governance` | `screens/governance-screen` | DAO proposals + audit trail |
| Open Service Requests | `/service-requests` | `skf/service-requests-screen` | Repair tickets list |
| SR Authenticity Check | `/service-requests/[srId]/authenticity` | `skf/sr-authenticity-screen` | Scan + 7-check verdict |
| Authenticity Reports | `/authenticity-reports` | `skf/authenticity-reports-screen` | Counterfeit reports list |
| Dealer Auth & Blacklist | `/channel-governance/dealers` | `skf/dealer-blacklist-screen` | Dealer leaderboard + enforcement |
| DAO Proposal detail | `/dao/proposals/[proposalId]` | `skf/dao-proposal-screen` | Vote tally + execute |

Supporting forms/panels: `skf/CounterfeitReportForm.tsx`, `skf/DealerActionPanel.tsx`,
and the reusable `panels/` (KpiTile, AttributionCard, TimelineList, ProvenanceFooter, etc.).

---

## 11. The Core Flow: Counterfeit → DAO

The headline journey, traced through one fake part (`SN-88421-A`):

```
1. SCAN     Technician opens SR-2026-1042, scans the QR.            → scanServiceRequest()
2. VERIFY   7 weighted checks run → 2 fail → COUNTERFEIT (94%).     → attribution[]
3. REPORT   Technician files CR-2026-0088 vs "Eastern Motors".      → fileCounterfeitReport()
4. SCORE    Reports tally → dealer signal score 78/100.             → getDealerSignal()
5. ENFORCE  DAO Proposal DAO-2026-0045 opens: "SUSPEND 90 days."    → openDaoProposal()
            Members vote (for 12 / against 4, quorum 15).
6. EXECUTE  Vote passes → dealer status changes + enforcement log.  → setSelectedDealerStatus()
                                                                       + addEnforcementEvent()
```

The dashboard, channel map, and audit trail all read from the same store, so an action on one
screen reflects everywhere. (See `blockchain.md` §4 for the full narrative and `merkle.md` for the
verification cryptography.)

---

## 12. Design System & Styling

- **Tailwind CSS v4** — utility classes directly in `className`. No separate CSS files per
  component.
- **`app/globals.css`** — imports Tailwind, defines **design tokens** (colors, radii) as CSS
  variables, and a set of project-specific component classes prefixed **`ds-`** (e.g.
  `ds-nav-link`, `ds-btn-icon`, `ds-toast-item`, `ds-shell-sidebar`). Dark mode via a `.dark` class
  on `<html>`.
- **Theme:** toggled in the header; persisted to `localStorage`; an inline script in
  `app/layout.tsx` applies the saved theme **before** first paint to avoid a flash.
- **`lib/motion.ts`** — shared Framer Motion presets (`pageTransition`, `fadeTransition`).
- **`lib/design.ts` / `lib/utils.ts`** — design helpers and the `cn()` class-merge utility
  (clsx + tailwind-merge).
- **Components:** shadcn style `base-nova`, Base UI primitives, lucide icons, CVA for variants.
- **Responsive:** collapsible sidebar (rail mode on desktop, drawer on mobile); `/field-verify`
  renders full-bleed (no header) to feel like a mobile scanner.

---

## 13. Build, Run & Deploy

**Prerequisites:** Node.js 20+, and npm or pnpm.

```bash
# install dependencies (pick one; two lockfiles exist)
npm install            # or: pnpm install

# run the dev server
npm run dev            # → http://localhost:3000

# production build + start
npm run build
npm run start

# lint
npm run lint
```

**Scripts (`package.json`):** `dev`, `build`, `start`, `lint` — standard Next.js.

**Notes:**
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so the app builds even with TS
  errors. Good for a fast-moving demo; you'd remove this for production.
- `images.unoptimized: true` disables Next's image optimization (no image server needed).
- **Deploy:** push to GitHub → import to **Vercel** → it auto-detects Next.js and builds. The
  project already references a Vercel URL and includes `@vercel/analytics`.

---

## 14. What's Real vs Simulated

| Thing | Status in this repo |
|---|---|
| UI, navigation, screens, transitions | **Real** and complete |
| Data (dealers, reports, scans, proposals) | **Simulated** — in-memory mock data |
| State changes (file report, anchor batch, vote) | **Real in-session** — mutate React state, reset on refresh |
| Blockchain (merkle roots, on-chain tx, DIDs) | **Simulated** — themed `0x…` strings |
| Smart contracts | **None** — only hinted at in code comments |
| Backend / database / auth | **None** |
| SAP / ERP integration | **None** — referenced in comments only |

To make it real, three upgrade paths are documented in the companion files:
- **`blockchain.md`** — the overall system + how to add a real chain (Solidity, viem/wagmi, IPFS).
- **`merkle.md`** — make the `merkle_proof_valid` check real cryptography.
- **`chains.md`** — stand up the actual **Private Ethereum (Geth + Clique PoA)** network the
  sidebar advertises.

---

## 15. Glossary & Companion Docs

**Quick glossary:** OEM = SKF (brand owner) · Dealer = seller (can be bad) · SR = Service Request ·
CR = Counterfeit Report · DID = decentralized identity · VC = verifiable credential · Minting =
first creation of a part's record · Custody chain = who-held-it list · Merkle root = batch
fingerprint · DAO = voting group · Signal score = 0–100 dealer risk · Enforcement = punishment.

**Companion learning docs in this repo:**
- [`blockchain.md`](./blockchain.md) — Blockchain & the system, zero to hero.
- [`merkle.md`](./merkle.md) — Merkle trees, zero to hero, with code + implementation plan.
- [`chains.md`](./chains.md) — Private chains, Geth, Clique PoA, gas & validator rewards.
- [`docs/ui-prompts/skf-counterfeit-pages.md`](./docs/ui-prompts/skf-counterfeit-pages.md) — the
  original spec for the SKF counterfeit feature.

**Best reading order for a newcomer to the code:**
`lib/store/types.ts` → `lib/store/seed.skf.ts` → `lib/store/provenance.ts` → `lib/navigation.ts`
→ `components/app-shell.tsx` → `components/providers/app-provider.tsx` →
`components/skf/sr-authenticity-screen.tsx`.

---

*This document describes the project as it exists: a complete front-end simulation. The
"blockchain," ERP, and backend layers are intentionally mocked; the companion docs are the roadmap
to making them real.*
