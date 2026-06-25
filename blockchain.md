# Blockchain Provenance — Zero to Hero

A complete, beginner-friendly guide to the **VoltusWave AMI** project: what blockchain is,
how this app uses it, the full business flow, the tech stack, and a step-by-step path to
**build this whole thing from scratch**.

> **The one-line summary**
> This is a **Next.js website** that *simulates* an anti-counterfeit system for **SKF** (a bearing
> manufacturer). A technician **scans** a part → the app **verifies** it against a (pretend)
> **blockchain provenance chain** → if fake, files a **report** → reports build a dealer **risk
> score** → a **DAO votes** to **punish** the dealer.
>
> ⚠️ **Honest truth for beginners:** there is **no real blockchain** in this codebase. The chain
> values (`0x8a3f…c21d`) are fake strings in seed data. This is a **UI demo**. But the entire
> interface is modelled on real blockchain concepts, so you must understand them. The last
> section explains how you'd add a *real* chain.

---

## Table of Contents

1. [Blockchain in Plain English](#1-blockchain-in-plain-english)
2. [The Blockchain Vocabulary](#2-the-blockchain-vocabulary)
3. [The Business Story](#3-the-business-story)
4. [The Full Flow (End to End)](#4-the-full-flow-end-to-end)
5. [The Tech Stack](#5-the-tech-stack)
6. [How a Page Renders (Tech Flow)](#6-how-a-page-renders-tech-flow)
7. [Project Structure Map](#7-project-structure-map)
8. [The Data Model](#8-the-data-model)
9. [Build It From Zero to Hero](#9-build-it-from-zero-to-hero)
10. [Going Real: Adding an Actual Blockchain](#10-going-real-adding-an-actual-blockchain)
11. [Glossary Cheat-Sheet](#11-glossary-cheat-sheet)

---

## 1. Blockchain in Plain English

A **blockchain** is a shared digital notebook with three magic properties:

1. **Everyone can read it.** No single owner hides the data.
2. **Nobody can secretly edit it.** Each page (a "block") is cryptographically linked to the
   previous one. Change an old page and every later page breaks — so tampering is obvious.
3. **No central boss is needed.** Many computers keep identical copies and agree on the truth.

**Why does an anti-counterfeit app want this?**
Because the core question is *"Is this part really genuine, and has its paper-trail been
faked?"* A blockchain gives you a tamper-proof paper-trail. If SKF writes "this part left our
factory" onto the chain, a counterfeiter **cannot** forge that record later.

Analogy: think of a part's history like a **passport with stamps**. A blockchain makes the
stamps impossible to forge and impossible to erase.

---

## 2. The Blockchain Vocabulary

| Term | Beginner meaning | Where it appears in code |
|---|---|---|
| **Blockchain** | Tamper-proof shared ledger | The whole theme; "Private Ethereum · connected" in `app-shell.tsx` |
| **DID** (Decentralized Identifier) | A permanent, unforgeable ID for a person/company. Like a crypto email address. | `did:voltus:dealer:dlr-ce-12` in `seed.skf.ts` |
| **VC** (Verifiable Credential) | A digitally-signed certificate ("SKF certifies X"). Can't be forged. | `vc_id: 'vc:dealer:112'` |
| **Minting** | Creating a part's digital record/token for the first time (at the factory). | "Batch Minting Console" screen |
| **Custody chain** | The ordered list of who held the part: PLANT → DISTRIBUTOR → DEALER → SERVICE_CENTRE → CUSTOMER | `custodyChains` in `seed.skf.ts` |
| **Custody event** | One hop in that chain (who, when, signed by which VC) | `CustodyEvent` in `types.ts` |
| **Merkle root / proof** | A cryptographic fingerprint proving a record belongs to a verified batch — without revealing the whole batch. | `merkle_root: '0x7f3a…b912'` |
| **On-chain ref / anchor / tx** | A transaction ID proving the proof was written to the chain. | `on_chain_tx: '0xsusp…02'` |
| **Anomaly flag** | A red flag found in the chain | `anomaly_flag: 'qr_replay_suspected'` |
| **DAO** (Decentralized Autonomous Org) | A group that **votes** on decisions instead of one boss deciding. | `daoProposals` in `seed.skf.ts` |
| **Quorum** | Minimum number of votes needed for a vote to count | `quorum_required: 15` |
| **Simple / super majority** | >50% vs a higher bar (e.g. for permanent bans) | `governance: 'dao_super_majority'` |

### How a Merkle proof actually works (optional deep-dive)

Imagine a factory makes 10,000 parts in a batch. You hash (fingerprint) each part, then pair up
hashes and hash those pairs, repeatedly, until you're left with **one** hash at the top: the
**Merkle root**. SKF writes only that single root to the blockchain.

To later prove part #4,217 is genuine, you don't need all 10,000 records — just a short path of
hashes up the tree. If that path rebuilds the on-chain root, the part is provably part of the
genuine batch. **Small proof, total certainty.** That's why `merkle_proof_valid` is the
highest-weighted check (0.2) in the verification.

---

## 3. The Business Story

**The cast of characters:**

| Who | Role |
|---|---|
| **SKF / OEM** | The manufacturer + brand owner. The "admin" of the app. (OEM = Original Equipment Manufacturer) |
| **Distributor** | Middle-man between factory and dealers |
| **Dealer** | A shop authorized to sell SKF parts. *Some cheat and sell fakes.* |
| **Service Centre / Technician** | The repair shop + person who opens a machine and discovers the fake |
| **Customer** | The end user (e.g. a fleet operator) |
| **DAO members** | The group that votes to punish bad dealers |

**The 5 dealers in the seed data are the 5 stages of the punishment ladder, frozen in time:**

| Dealer | Status | Signal score | Story |
|---|---|---|---|
| Nordic Bearing Supply | Authorized | 8 | Clean & trusted |
| Autohaus Müller | Under review | 34 | A few suspicious reports |
| Eastern Motors Parts | **Warned** | 78 | A live SUSPEND vote is open right now |
| Midlands Industrial | Suspended | 91 | Already punished by DAO vote |
| Grey Channel Trading | Blacklisted | 100 | Permanently banned (super-majority) |

The **signal score (0–100)** is the dealer's risk number. It's built from factors like:
confirmed lab reports, number of distinct service centres reporting them, failure-mode
concentration, and repeat-offender history.

---

## 4. The Full Flow (End to End)

Follow **one fake part**, serial `SN-88421-A`, through the entire system:

```
1. SCAN
   Technician Jan van Berg opens Service Request SR-2026-1042 and scans the part's QR code.
   → code: scanServiceRequest()  in  lib/store/provenance.ts

2. VERIFY  — the app runs 7 weighted checks:
   ✓ Merkle proof valid (0.20)     ✓ Root anchored on chain (0.15)   ✓ Batch active (0.10)
   ✗ Dealer authorized (0.20)      ✗ Custody continuous (0.15)       ✓ QR not replayed (0.10)
   ✗ Region consistent (0.10)
   Two heavy checks FAILED → verdict: COUNTERFEIT, 94% confidence.
   (These checks + weights = the "attribution" shown in the UI.)

3. REPORT
   Jan files Counterfeit Report CR-2026-0088 against dealer "Eastern Motors Parts".
   → fileCounterfeitReport()

4. SCORE
   The system tallies all reports vs that dealer → signal score = 78/100.
   → getDealerSignal()

5. ENFORCE via DAO VOTE
   Score crossed a threshold → DAO Proposal DAO-2026-0045 opens: "SUSPEND dealer 90 days."
   Members vote (for: 12, against: 4). Needs quorum of 15.
   → openDaoProposal()

6. EXECUTE
   If the vote passes → dealer status changes (Authorized → Warned → Suspended → Blacklisted)
   and an Enforcement event is logged with an on-chain transaction id.
   → setSelectedDealerStatus()  +  addEnforcementEvent()
```

**The verification logic (simplified from `scanServiceRequest`):**

```
result = AUTHENTIC                       // optimistic default
if (no product record)        → CANNOT_VERIFY
else if (dealer not Authorized OR any anomaly flag) → COUNTERFEIT
else if (custody chain too short) → CANNOT_VERIFY

confidence = AUTHENTIC ? 0.99 : COUNTERFEIT ? 0.92 : 0.45
```

**Where each step lives:**

| Step | Screen (UI) | Data function |
|---|---|---|
| List service requests | `components/skf/service-requests-screen.tsx` | `getServiceRequests()` |
| Authenticity check | `components/skf/sr-authenticity-screen.tsx` | `scanServiceRequest()` |
| File a fake report | `components/skf/CounterfeitReportForm.tsx` | `fileCounterfeitReport()` |
| Reports list | `components/skf/authenticity-reports-screen.tsx` | `getCounterfeitReports()` |
| Dealer punishment console | `components/skf/dealer-blacklist-screen.tsx` | `getDealerLeaderboard()` |
| DAO vote detail | `components/skf/dao-proposal-screen.tsx` | `getDaoProposal()` |

---

## 5. The Tech Stack

Everything you must learn, in dependency order (learn top-down):

| Layer | Tool | Version | What it does | Learn it for |
|---|---|---|---|---|
| Language | **TypeScript** | 5.7 | JavaScript + type safety (`interface Dealer {}`) | Catching bugs before runtime |
| UI library | **React** | 19 | Build UI from reusable **components** | The mental model of the whole app |
| Framework | **Next.js (App Router)** | 16 | Routing, layouts, rendering. Folders = URLs. | How pages & navigation work |
| Styling | **Tailwind CSS** | 4 | Style via class names (`flex gap-2 text-sm`) | Every `className` in the code |
| Animation | **Framer Motion** | 12 | Page transitions, fades (`motion.div`) | The smooth UI feel |
| Charts | **Recharts** | 3 | Bar/line graphs of dealer data | The dashboard visuals |
| Icons | **lucide-react** | — | SVG icons (`<Shield/>`, `<QrCode/>`) | Visual labels |
| Components | **shadcn / Base UI** | — | Pre-built buttons, badges, popovers | Reusable UI parts |
| Analytics | **@vercel/analytics** | — | Page-view tracking (prod only) | Optional |

**You do NOT need to learn (for this demo):** Solidity, smart contracts, web3.js, wallets, gas,
or any real blockchain SDK — because the chain is simulated. (Section 10 covers them if you want
the *real* version.)

### The learning order I recommend

```
1. JavaScript basics        →  variables, functions, arrays, objects, async/await
2. TypeScript               →  types, interfaces, generics (just enough)
3. React                    →  components, props, state (useState), context
4. Next.js App Router       →  app/ folder, page.tsx, layout.tsx, routing
5. Tailwind CSS             →  utility classes
6. Then the extras          →  Framer Motion, Recharts, lucide icons
7. Finally blockchain       →  the concepts in sections 1–2 (real chain only if you go further)
```

---

## 6. How a Page Renders (Tech Flow)

Learn this single chain and the whole repo makes sense:

```
You type a URL
   → Next.js finds the matching folder in app/(app)/
   → renders app/(app)/layout.tsx          (the page wrapper)
   → which uses <AppShell>                  (sidebar + header you always see)
   → which renders the page.tsx for that URL
   → page.tsx renders a "screen" component  (components/screens/ or components/skf/)
   → the screen asks lib/store/provenance.ts for data
   → which returns data seeded from lib/store/seed.skf.ts
```

Key files that drive this:
- **`lib/navigation.ts`** — the *map*: every screen, its URL, icon, and sidebar group. The
  sidebar just loops over this.
- **`components/app-shell.tsx`** — the persistent frame (collapsible sidebar, header, theme
  toggle, page transitions).
- **`components/providers/app-provider.tsx`** — global state shared everywhere (dark mode,
  selected dealer, toasts).

### React concepts you'll see everywhere

- **Component** — a function returning UI: `function StatusBadge() { return <span>…</span> }`
- **Props** — inputs passed to a component: `<StatusBadge status="Suspended" />`
- **State** — data that changes and re-draws the screen: `const [isDark, setIsDark] = useState(false)`
- **Context/Provider** — share state app-wide without passing props through every level
- **`'use client'`** — top-of-file marker meaning "run this in the browser" (needed for clicks/state)

---

## 7. Project Structure Map

```
BlockChain/
├── app/                        # Next.js App Router — folders = URLs
│   ├── layout.tsx              # root <html>, fonts, theme init
│   ├── globals.css             # Tailwind + design tokens
│   └── (app)/                  # route group (parentheses = no URL segment)
│       ├── layout.tsx          # wraps pages in <AppShell>
│       ├── page.tsx            # "/" home dashboard
│       ├── field-verify/page.tsx
│       ├── service-requests/
│       │   ├── page.tsx                       # /service-requests
│       │   └── [srId]/authenticity/page.tsx   # dynamic route
│       ├── authenticity-reports/page.tsx
│       ├── channel-governance/dealers/page.tsx
│       └── dao/proposals/[proposalId]/page.tsx
│
├── components/
│   ├── app-shell.tsx           # sidebar + header frame
│   ├── screens/                # main screen implementations
│   ├── skf/                    # the counterfeit/provenance feature (newest work)
│   ├── panels/  ui/  ui-ami/   # reusable building blocks (KPI tiles, tables, charts)
│   ├── badges/                 # StatusBadge
│   └── providers/app-provider.tsx   # global state
│
├── lib/
│   ├── navigation.ts           # the route + nav map
│   ├── store/
│   │   ├── types.ts            # ALL data shapes (start reading here)
│   │   ├── seed.skf.ts         # the fake database contents
│   │   └── provenance.ts       # queries + mutations (the "API")
│   ├── data/                   # supplementary mock data
│   ├── design.ts  motion.ts  utils.ts
│
├── docs/ui-prompts/            # original spec docs
├── package.json                # dependencies + scripts
├── tsconfig.json               # TypeScript config
├── next.config.mjs             # Next.js config
└── postcss.config.mjs          # Tailwind/PostCSS config
```

**Best reading order for a newcomer:**
1. `lib/store/types.ts` — learn the nouns (Dealer, ServiceRequest, etc.)
2. `lib/store/seed.skf.ts` — see real example data
3. `lib/store/provenance.ts` — see the logic (scan, report, vote)
4. `lib/navigation.ts` — see the screen map
5. `components/app-shell.tsx` — see the frame
6. `components/skf/sr-authenticity-screen.tsx` — see a real screen

---

## 8. The Data Model

The whole "database" is one TypeScript object, `SkfStore`, defined in `lib/store/types.ts`:

```ts
interface SkfStore {
  serviceRequests:     ServiceRequest[]          // repair tickets + scan results
  counterfeitReports:  CounterfeitReport[]        // filed "this is fake" complaints
  dealers:             Dealer[]                    // the 5 dealers + statuses
  dealerEnforcementLog: EnforcementEvent[]         // history of punishments
  daoProposals:        DaoProposal[]               // votes to punish dealers
  products:            Record<string, Product>     // serial → part info
  custodyChains:       Record<string, CustodyEvent[]>   // serial → who held it
  dealerSignalScores:  Record<string, {score, attributions}>  // risk per dealer
}
```

**The key status ladders (string unions in `types.ts`):**

```
DealerStatus:      Authorized → Under review → Warned → Suspended → Blacklisted
VerificationResult: AUTHENTIC | COUNTERFEIT | CANNOT_VERIFY | NOT_YET_SCANNED
ReportSeverity:    SUSPECTED → CONFIRMED_VISUAL → CONFIRMED_LAB
DaoProposalStatus: Open → Passed/Failed → Executed | Cancelled
CustodyRole:       PLANT → DISTRIBUTOR → DEALER → SERVICE_CENTRE → CUSTOMER
```

**How the "database" works without a server:**
`provenance.ts` keeps a single in-memory copy: `let store = structuredClone(skfSeed)`.
All reads (`getDealers()`) and writes (`fileCounterfeitReport()`) mutate that object. Refresh the
browser and it resets to the seed — because it's just JavaScript memory, not a real DB.

---

## 9. Build It From Zero to Hero

A realistic, ordered path to recreate this project from an empty folder.

### Stage 0 — Prerequisites
- Install **Node.js** (v20+) and **npm** (or **pnpm**).
- Learn just enough JS: variables, functions, arrays, `.map()/.filter()`, objects, `async/await`.

### Stage 1 — Scaffold the app
```bash
npx create-next-app@latest my-provenance-app --typescript --tailwind --app --eslint
cd my-provenance-app
npm run dev        # open http://localhost:3000
```
You now have Next.js + TypeScript + Tailwind working. Understand `app/page.tsx` and
`app/layout.tsx`.

### Stage 2 — Learn the building blocks (small experiments)
- Make a component that takes **props**: `<StatusBadge status="Suspended" />`.
- Add **state** with `useState` (a dark-mode toggle is perfect — mirror `app-provider.tsx`).
- Add a second page by creating `app/about/page.tsx` — see folder-based routing.

### Stage 3 — Design the data model FIRST
Create `lib/store/types.ts`. Define your nouns before any UI:
`Product`, `Dealer`, `ServiceRequest`, `Verification`, `CounterfeitReport`, `DaoProposal`,
`CustodyEvent`. **This is the most important step** — the UI is just a view of this model.

### Stage 4 — Add fake data + a fake "API"
- `lib/store/seed.skf.ts` — hand-write a few dealers, products, custody chains.
- `lib/store/provenance.ts` — write functions: `getDealers()`, `scanServiceRequest()`,
  `fileCounterfeitReport()`, `openDaoProposal()`. Keep one in-memory `store` object.

### Stage 5 — Build the shell + navigation
- `lib/navigation.ts` — list your screens (id, href, label, icon, group).
- `components/app-shell.tsx` — sidebar that loops over the nav, plus a header.
- `app/(app)/layout.tsx` — wrap all pages in `<AppShell>`.

### Stage 6 — Build screens one at a time, following the flow
1. **Service requests list** → reads `getServiceRequests()`
2. **Authenticity check** (dynamic route `[srId]`) → calls `scanServiceRequest()`, shows the
   7 weighted checks
3. **Counterfeit report form** → calls `fileCounterfeitReport()`
4. **Dealer console** → `getDealerLeaderboard()` with the signal scores
5. **DAO proposal** (dynamic route `[proposalId]`) → voting UI

### Stage 7 — Polish
- Add **Recharts** for the dashboard graphs.
- Add **Framer Motion** for page transitions.
- Add dark mode, toasts, empty states, loading states.
- Wire up cross-page state (e.g. "selected dealer persists across navigation") via the provider.

### Stage 8 — Ship
```bash
npm run build && npm run start     # production build
```
Deploy to **Vercel** (the natural home for Next.js): push to GitHub → import in Vercel → done.

**You are now a "hero" of the UI demo.** To become a true blockchain hero, continue to Section 10.

---

## 10. Going Real: Adding an Actual Blockchain

Right now the chain is faked. Here's how you'd make it real — and the new vocabulary that comes with it.

| Concept | What it adds | Tool to learn |
|---|---|---|
| **Smart contract** | Code that lives ON the blockchain and enforces rules (mint a part, record custody, run a DAO vote) | **Solidity** language |
| **EVM / Ethereum** | The "computer" that runs smart contracts. This app hints at a **Private Ethereum** network. | Ethereum docs |
| **Wallet** | Your blockchain identity + signer (the real version of a DID) | **MetaMask** |
| **Gas** | The fee paid to run a transaction | — |
| **Dev framework** | Compile/test/deploy contracts locally | **Hardhat** or **Foundry** |
| **Frontend bridge** | Let the React app read/write the chain | **viem** / **wagmi** / ethers.js |
| **DID / VC standards** | Real decentralized identity + signed credentials | W3C DID & VC specs |
| **IPFS** | Store big files (photos, lab reports) off-chain, anchor their hash on-chain | IPFS |

**What each fake field becomes real:**
- `merkle_root` → actually computed from a batch and stored in a smart contract at mint time.
- `on_chain_tx` → a real Ethereum transaction hash you can look up in a block explorer.
- `did:voltus:dealer:...` → a real DID backed by a wallet keypair.
- DAO `votes` → an on-chain governance contract (e.g. OpenZeppelin Governor) tallying real votes.
- `scanServiceRequest()` → instead of checking the in-memory store, it would call the contract's
  `verify(serial, merkleProof)` function.

**A realistic "go real" roadmap:**
1. Learn Solidity basics; write a `Provenance.sol` (mint, addCustody, verify).
2. Test it locally with Hardhat.
3. Add a `Governance.sol` (or use OpenZeppelin Governor) for DAO votes.
4. Deploy to a testnet (or a private chain).
5. Swap `lib/store/provenance.ts`'s in-memory calls for `viem`/`wagmi` contract calls.
6. Add MetaMask login so technicians/dealers sign with real wallets.
7. Store photos & lab PDFs on IPFS; put only their hashes on-chain.

---

## 11. Glossary Cheat-Sheet

**Business:** OEM = brand owner (SKF) · Dealer = seller (can be bad) · Technician = finds the fake ·
SR = Service Request (repair ticket) · CR = Counterfeit Report · Enforcement = punishment ·
Signal score = 0–100 dealer risk.

**Blockchain:** DID = crypto identity · VC = signed certificate · Minting = first creation of a
record · Custody chain = who-held-it list · Merkle root = batch fingerprint · On-chain tx =
transaction id · DAO = voting group · Quorum = min votes to count.

**Tech:** Next.js = framework (folders=URLs) · React = UI components · TypeScript = JS + types ·
Tailwind = styling via class names · Component = reusable UI function · Props = inputs · State =
changing data that redraws · Provider = app-wide shared state · `page.tsx` = a screen ·
`layout.tsx` = a wrapper · `[id]` = dynamic route · `'use client'` = runs in browser ·
Store/seed = the fake database.

---

*This guide describes the project as a UI simulation. The "blockchain" is themed mock data in
`lib/store/`; Section 10 is the path to making it a real on-chain system.*
