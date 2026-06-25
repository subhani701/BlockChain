# Blockchain Networks & Geth Private Chains — Zero to Hero

A complete, beginner-friendly guide to **blockchain networks**: the types of chains, how
**consensus** works (PoW, PoS, **Clique PoA**, IBFT/QBFT, Raft), how to stand up a **private
Ethereum chain with Geth** step by step, how **gas** behaves differently on private chains, and
the big question — **why Clique PoA validators earn no reward while PoW/PoS validators do**.

> **Where this fits the project**
> The sidebar in `components/app-shell.tsx` shows **"Private Ethereum · connected"**. That is
> exactly what this guide teaches you to build: a *private, permissioned Ethereum network* — the
> natural home for an enterprise provenance system where only SKF + its partners run nodes.
> A consortium of known companies + no token speculation + free transactions = **Clique PoA**.

---

## Table of Contents

1. [Mental Model: What a "Chain" Actually Is](#1-mental-model-what-a-chain-actually-is)
2. [The Three Types of Chains](#2-the-three-types-of-chains)
3. [Consensus: How Nodes Agree](#3-consensus-how-nodes-agree)
4. [What Is Geth?](#4-what-is-geth)
5. [Clique PoA Explained in Depth](#5-clique-poa-explained-in-depth)
6. [Hands-On: Build a Private Geth + Clique Chain](#6-hands-on-build-a-private-geth--clique-chain)
7. [Gas — and Why It Differs Per Chain](#7-gas--and-why-it-differs-per-chain)
8. [Validator Rewards: Why Clique Pays Nothing](#8-validator-rewards-why-clique-pays-nothing)
9. [Other Private-Chain Engines (IBFT, QBFT, Raft)](#9-other-private-chain-engines-ibft-qbft-raft)
10. [Connecting This dApp to the Chain](#10-connecting-this-dapp-to-the-chain)
11. [Comparison Tables & Cheat-Sheet](#11-comparison-tables--cheat-sheet)

---

## 1. Mental Model: What a "Chain" Actually Is

A blockchain network is just **many computers (nodes) running the same software, each keeping an
identical copy of a shared ledger, agreeing on new blocks via a consensus rule.**

Four moving parts you must separate in your head:

| Part | Plain meaning | Example |
|---|---|---|
| **Node / client** | The software that stores the chain & validates blocks | **Geth**, Besu, Erigon |
| **Network** | The set of nodes talking to each other (identified by a **chainId**) | Mainnet = chainId 1; your private = e.g. 1337 |
| **Consensus** | The rule deciding who creates the next block & how others agree | PoW, PoS, Clique PoA |
| **Genesis** | The very first block (block 0) + the network's config | `genesis.json` |

> A "private chain" is **not** different software — it's the **same Geth**, started with **your own
> genesis file**, a **different chainId**, and a **permissioned consensus** so outsiders can't join.

---

## 2. The Three Types of Chains

| Type | Who can read? | Who can write (produce blocks)? | Example | Best for |
|---|---|---|---|---|
| **Public / permissionless** | Anyone | Anyone (open validator set) | Ethereum Mainnet, Bitcoin | Open finance, public dApps |
| **Consortium / permissioned** | Members (or public read) | A **known, approved** set of organizations | SKF + partners | Enterprise / supply chain |
| **Private** | One organization | Nodes that org controls | A single-company test net | Internal R&D, this demo |

**This project = Consortium / Private**, because:
- Participants are **known companies** (SKF, distributors, dealers, service centres) — not anonymous.
- You don't want a public token, mining, or speculation.
- You want **fast, free, final** transactions and **control over who joins**.

That combination points straight at **Proof of Authority (Clique)** or **IBFT/QBFT**.

---

## 3. Consensus: How Nodes Agree

Consensus answers: *"Of all the nodes, who gets to add the next block, and how does everyone agree
it's valid?"* Here are the families you need to know.

### Proof of Work (PoW) — "burn electricity to earn the right"
- Miners race to solve a hard math puzzle; winner proposes the block.
- **Security** comes from the cost of computing power.
- **Slow, energy-hungry, probabilistic finality** (blocks can be reorged).
- Miners **earn a block reward + fees** (incentive to spend electricity).
- *Ethereum used this until "The Merge" (Sept 2022). Geth's built-in PoW (Ethash) is now
  deprecated for real networks.*

### Proof of Stake (PoS) — "lock up money to earn the right"
- Validators stake coins; the protocol pseudo-randomly picks a proposer.
- Misbehave → your stake gets **slashed**.
- **Energy-light, faster, economic finality.** This is **Ethereum Mainnet today.**
- Validators **earn issuance + fees + tips** for honest work.

### Proof of Authority (PoA) — "trusted identities take turns"
- A fixed list of **approved signers (authorities)** take turns sealing blocks in a round-robin.
- Security comes from **reputation/identity**, not energy or money.
- **Fast, cheap, deterministic, tiny resource use.** Perfect for **private/consortium** chains.
- **Geth's PoA engine is called `clique`.** (Hyperledger Besu also offers IBFT/QBFT PoA.)
- **No block reward** — and section 8 explains exactly why.

### BFT-style (IBFT / QBFT / Raft) — "vote each block to instant finality"
- Validators **vote** on each block; once a super-majority signs, the block is **final
  immediately** (no reorgs ever).
- Used by enterprise stacks (Besu, GoQuorum). Great when you need **instant finality** and a
  known validator set.

---

## 4. What Is Geth?

**Geth (go-ethereum)** is the original, most popular **Ethereum client** — the program that:
- stores the blockchain,
- executes the **EVM** (Ethereum Virtual Machine) to run smart contracts,
- talks to other nodes (P2P),
- exposes a **JSON-RPC API** (over HTTP/WebSocket) that your dApp calls.

You can run the *same Geth binary* against Mainnet **or** your own private network — the difference
is entirely in the **genesis file + flags** you start it with.

Install (examples):
```bash
# macOS
brew tap ethereum/ethereum && brew install ethereum
# Ubuntu
sudo add-apt-repository -y ppa:ethereum/ethereum && sudo apt update && sudo apt install ethereum
# verify
geth version
```

> **Heads-up (honesty):** Geth has been removing some private-network conveniences over time
> (the old `puppeth` tool is gone; built-in PoW is deprecated post-Merge). **Clique PoA** is still
> the canonical, simplest way to run a private Geth chain, so that's what we use. For brand-new
> production consortia, many teams now choose **Hyperledger Besu (QBFT)** — covered in §9.

---

## 5. Clique PoA Explained in Depth

**Clique** is Geth's Proof-of-Authority engine (spec: EIP-225). The essentials:

- A set of **signers** (a.k.a. authorities/validators) is allowed to seal blocks.
- Signers **take turns** in a deterministic round-robin. Each block has a designated **in-turn**
  signer (who seals immediately) and **out-of-turn** signers (who may seal after a small random
  delay, as a backup if the in-turn one is offline).
- Block time is **fixed** (you set `period` in genesis, e.g. 5 or 15 seconds). If there are no
  transactions, Clique can still produce empty blocks each period (or stay idle on `period: 0`).
- **Governance is on-chain by vote:** existing signers **vote** to add or remove a signer. A
  proposal needs **> 50%** of current signers to agree. This is how the validator set evolves
  without restarting the network.
- **No mining, no staking, no block reward.** Sealing costs almost nothing.

**Where the signer list lives:** the **`extradata`** field of the genesis block encodes the initial
signer addresses. Its layout:

```
extradata = 0x
            + 32 bytes of zeros        (vanity, 64 hex chars)
            + one or more 20-byte signer addresses (40 hex chars each, NO 0x)
            + 65 bytes of zeros        (signature seal, 130 hex chars)
```

So for **one** signer the `extradata` is `0x` + 64 zeros + `<address-without-0x>` + 130 zeros.

---

## 6. Hands-On: Build a Private Geth + Clique Chain

A full, copy-pasteable walkthrough. We'll make a 1-signer chain, then note how to add more.

### Step 1 — Create a data directory and a signer account
```bash
mkdir -p ~/skf-chain/node1
geth --datadir ~/skf-chain/node1 account new
# It prints an address like: 0xAbC123...def  (SAVE this; you'll need it in extradata)
# Keep the password file safe, e.g. echo "mypassword" > ~/skf-chain/password.txt
```

### Step 2 — Write the genesis file
`~/skf-chain/genesis.json` (replace `<SIGNER_ADDRESS_NO_0x>` with your account, no `0x`):

```json
{
  "config": {
    "chainId": 1337,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "30000000",
  "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000<SIGNER_ADDRESS_NO_0x>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
    "<SIGNER_ADDRESS_NO_0x>": { "balance": "1000000000000000000000000" }
  }
}
```

Key fields explained:
- `chainId: 1337` — your network's unique id (must be unique vs other nets the wallet knows).
- `clique.period: 5` — a new block every **5 seconds**.
- `clique.epoch: 30000` — every 30k blocks is a checkpoint that re-affirms the signer list.
- `gasLimit: 30000000` — max gas per block (set high; it's your chain).
- `extradata` — encodes the initial signer (the 32-zero vanity + your address + 65-zero seal).
- `alloc` — pre-funds your signer with Ether so it can pay for transactions (handy even when
  gasPrice is 0).

### Step 3 — Initialize the node with the genesis
```bash
geth --datadir ~/skf-chain/node1 init ~/skf-chain/genesis.json
# "Successfully wrote genesis state"
```

### Step 4 — Start the node as a signer (sealer)
```bash
geth --datadir ~/skf-chain/node1 \
  --networkid 1337 \
  --http --http.addr 0.0.0.0 --http.port 8545 \
  --http.api "eth,net,web3,personal,clique,miner,admin" \
  --http.corsdomain "*" \
  --ws --ws.addr 0.0.0.0 --ws.port 8546 --ws.api "eth,net,web3" \
  --allow-insecure-unlock \
  --unlock "0x<SIGNER_ADDRESS>" --password ~/skf-chain/password.txt \
  --mine --miner.etherbase "0x<SIGNER_ADDRESS>" \
  --nodiscover
```
- `--mine` tells the signer to start sealing blocks (in Clique this means "seal," not PoW mining).
- `--http` exposes the JSON-RPC endpoint at `http://localhost:8545` — **this is what your dApp
  connects to.**
- `--nodiscover` keeps the node from auto-finding random peers (private network hygiene).

You now have a live private chain producing a block every 5 seconds. 🎉

### Step 5 — Verify it's alive
```bash
geth attach ~/skf-chain/node1/geth.ipc
> eth.blockNumber              // climbs every ~5s
> clique.getSigners()          // shows your signer address
> net.version                  // "1337"
```

### Step 6 — Add a second node / signer (consortium)
1. On a second machine/dir, create another account + `init` with the **same genesis.json**.
2. Connect the peers: get node1's enode (`admin.nodeInfo.enode`) and on node2 run
   `admin.addPeer("<enode-of-node1>")`.
3. From an existing signer, **propose** the new signer:
   ```js
   clique.propose("0x<NEW_SIGNER_ADDRESS>", true)   // true = add  (false = remove)
   ```
   Once > 50% of current signers have proposed it, the new signer joins the rotation — **no
   restart needed.** That's PoA on-chain governance in action.

---

## 7. Gas — and Why It Differs Per Chain

### What gas is (everywhere)
- Every EVM operation costs **gas** (a unit of computational work). A transfer ≈ 21,000 gas; a
  contract call costs more depending on what it does.
- **Fee = gas used × gas price.** Gas price is paid in the chain's native coin (ETH on Mainnet).
- Each **block has a gas limit** — the total work it can hold (e.g. 30M gas).
- Post-London (EIP-1559), the price splits into **base fee (burned) + priority tip (to validator)**.

### Why gas exists
On a **public** chain, gas does two jobs:
1. **Pays validators** for the work + **prevents spam/DoS** (attacks cost real money).
2. **Allocates scarce block space** via a fee market (higher tip = faster inclusion).

### How it's different on a **private/PoA** chain
On your own consortium chain there's **no speculation and no anonymous attacker paying for spam**,
so you typically **set the gas price to 0** ("gasless"):

| Aspect | Public chain (Mainnet) | Private / Clique chain |
|---|---|---|
| Gas **price** | Market-driven, can spike | Usually **0** (free transactions) |
| Native coin | ETH has real value | Internal coin has **no value** |
| Who pays | Users pay ETH | Often **nobody pays** (gasPrice 0) |
| Gas **limit** | Network-governed (~30M) | You choose it in genesis (can be huge) |
| Spam protection | Cost of gas | **Permissioning** (only known nodes) |
| Base fee burned? | Yes (EIP-1559) | Often disabled / irrelevant |

**Why you can make it free:** spam is impossible because only **approved nodes** can submit/seal —
the access control replaces the economic deterrent. To run gas-free in practice:
- Start Geth with a tiny floor: `--miner.gasprice 0` and `--rpc.allow-unprotected-txs` as needed.
- Send transactions with `gasPrice: 0`.
- Pre-fund accounts via `alloc` anyway (some tooling still checks balance ≥ 0).

> **Mental model:** Gas is still *measured* on a private chain (the EVM is the same), but it's
> *priced at zero* and serves only as an internal "work meter," not as money.

---

## 8. Validator Rewards: Why Clique Pays Nothing

This is the question you asked — here's the precise answer.

### On PoW and PoS, validators DO get paid — because they must be bribed to behave
- **PoW miners** spend real electricity. Without a **block reward + fees**, no one would mine.
  The reward is the economic incentive that *funds* and *secures* the network.
- **PoS validators** lock up capital and risk **slashing**. They earn **protocol issuance + tips**
  as a return on stake and a reward for honest, online behavior.
- In both cases the reward exists to align **anonymous, self-interested** participants with the
  network's health. **Security is bought with money.**

### On Clique PoA, validators get NOTHING — and that's by design
- Clique signers are **known, trusted, pre-approved organizations** (SKF, partners). They run
  nodes because they have a **business reason** to — they *want* the provenance ledger to work.
  Their incentive is **external** (the value of the application), not an in-protocol token reward.
- **Sealing a block in Clique is nearly free** (a signature, no mining, no staking). There is no
  electricity to reimburse and no stake at risk, so **no reward is needed** to motivate them.
- Issuing rewards would require an inflating native token — but a private consortium **doesn't want
  a valuable, inflating coin**. The coin is just an internal gas meter (§7). Paying rewards in a
  worthless coin would be pointless.
- **Security model differs:** PoA's security is **identity & legal accountability** (a misbehaving
  signer is a known company that can be removed by vote and sued), *not* economic cost. So there's
  nothing to compensate.

**In one line:** *PoW/PoS pay validators because security is bought from anonymous strangers with
money; Clique PoA needs no payment because security comes from the known identity and business
self-interest of the signers, and sealing costs them virtually nothing.*

### "But transactions have fees — where do those go?"
On a gas-free private chain you set **gasPrice = 0**, so there are effectively **no fees to
distribute**. If you *did* charge a non-zero gas price, the priority tips would go to the block's
signer (`etherbase`) like any EVM chain — but consortia almost always run at zero, so signers
collect nothing. The **block reward is hard-zero in Clique regardless.**

### How do you incentivize node operators then?
Not via the protocol. You use **off-chain / business mechanisms**:
- Membership agreements / consortium contracts (each member runs a node as a condition of joining).
- Shared operational cost-splitting.
- The plain business value of the application (catching counterfeits saves SKF money).
- Service-level agreements and governance rules enforced legally, not cryptographically.

---

## 9. Other Private-Chain Engines (IBFT, QBFT, Raft)

Clique is the simplest, but enterprises often want **instant finality**. Alternatives:

| Engine | Client(s) | Finality | Notes |
|---|---|---|---|
| **Clique (PoA)** | Geth | Probabilistic (small reorg risk) | Simplest; round-robin signers; what we built above |
| **IBFT 2.0 (PoA/BFT)** | Besu, GoQuorum | **Immediate** | Validators vote each block; tolerates < 1/3 faulty |
| **QBFT (PoA/BFT)** | Besu, GoQuorum | **Immediate** | Modern successor to IBFT; recommended for new consortia |
| **Raft** | GoQuorum | Immediate (crash-fault, not Byzantine) | Very fast; assumes nodes don't act maliciously |

When to pick what:
- **Quick demo / dev / this project's vibe** → **Geth + Clique** (you already know the steps).
- **Production consortium needing guaranteed no-reorg finality** → **Besu + QBFT**.
- **Trusted internal cluster, max speed, no Byzantine threat** → **GoQuorum + Raft**.

All of them share the PoA philosophy: **known validators, no mining, no block reward, gas usually
zero.** Section 8's reasoning applies to all of them.

---

## 10. Connecting This dApp to the Chain

Today the project's chain is **simulated** (mock `0x…` strings in `lib/store/seed.skf.ts`, and the
"Private Ethereum · connected" label is decorative). Here's how to point it at a **real** Geth
Clique node:

1. **Run the chain** (Section 6) → JSON-RPC at `http://localhost:8545`, chainId `1337`.
2. **Add a web3 library** to the app:
   ```bash
   npm install viem        # modern, TypeScript-first (or wagmi for React hooks)
   ```
3. **Create a client** pointing at your node:
   ```ts
   import { createPublicClient, http } from 'viem';
   const client = createPublicClient({
     chain: { id: 1337, name: 'SKF Private', nativeCurrency: { name: 'SKF', symbol: 'SKF', decimals: 18 },
              rpcUrls: { default: { http: ['http://localhost:8545'] } } },
     transport: http(),
   });
   const block = await client.getBlockNumber();   // real data from your chain
   ```
4. **Deploy a `Provenance.sol` contract** (mint roots, verify parts — see `merkle.md` §9 Phase 5).
5. **Swap the in-memory calls** in `lib/store/provenance.ts` for contract reads/writes via viem.
   - `scanServiceRequest()` → calls the contract's `verify(serial, leaf, proof)`.
   - `merkle_root` / `chain_anchor_ref` → become **real** values from on-chain events.
6. **MetaMask**: add a custom network (RPC `http://localhost:8545`, chainId `1337`) so dealers /
   technicians sign with real wallets (real DIDs).

After this, the sidebar's "Private Ethereum · connected" stops being a label and becomes the truth.

---

## 11. Comparison Tables & Cheat-Sheet

### Consensus at a glance
| | PoW | PoS | Clique PoA | IBFT/QBFT |
|---|---|---|---|---|
| Security from | Electricity | Staked capital | **Identity/reputation** | Identity + BFT votes |
| Validator reward | Block reward + fees | Issuance + tips | **None** | **None** |
| Energy use | Very high | Low | **Tiny** | Tiny |
| Finality | Probabilistic | Economic | Probabilistic | **Immediate** |
| Who can validate | Anyone | Anyone w/ stake | **Approved signers** | Approved validators |
| Best for | Public, open | Public, open | **Private/consortium** | Enterprise, instant finality |
| Gas price | Market | Market | **Usually 0** | Usually 0 |

### Private-chain setup cheat-sheet (Geth + Clique)
```
1. geth account new                       # create signer, note the address
2. write genesis.json                      # chainId, clique{period,epoch}, extradata(signer), alloc
   extradata = 0x + 64 zeros + signer(no 0x) + 130 zeros
3. geth --datadir DIR init genesis.json    # initialize
4. geth --datadir DIR --networkid ID \     # run as sealer
        --http --http.api "eth,net,web3,clique,miner" \
        --unlock SIGNER --password pw.txt --mine --miner.etherbase SIGNER
5. attach: clique.getSigners(), eth.blockNumber
6. add signers: clique.propose(addr, true) # >50% of signers must agree
```

### One-paragraph recap
> A private Ethereum chain is the **same Geth** started with your **own genesis** and a
> **permissioned consensus** (usually **Clique PoA**). A fixed set of **approved signers** take
> turns sealing blocks; the validator set is governed **on-chain by majority vote**. Gas is still
> *measured* but typically **priced at 0** because **permissioning** (not money) stops spam.
> **No validator rewards exist** because signers are trusted businesses with external incentives
> and near-zero sealing cost — unlike PoW/PoS, where rewards are required to bribe anonymous
> participants into spending electricity or risking stake. For guaranteed finality, swap Clique for
> **QBFT/IBFT** on Besu or GoQuorum — same PoA philosophy, instant finality.

---

*Next step suggestion: follow Section 6 to run a real Clique node locally, then Section 10 to point
the app's `provenance.ts` at it — turning "Private Ethereum · connected" from a label into a fact.*
