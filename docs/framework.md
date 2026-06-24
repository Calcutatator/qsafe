# Quantum-Proofing Blockchains — A Component Framework

*A generalizable model for classifying where quantum-breakable cryptography lives in any chain, built so it can be used to compare many chains side by side. First-class focus: EVM, SVM (Solana), and Cairo (Starknet). Dual-layer by design — a precise technical structure underneath, a plain-language label on top.*

*Last updated: June 2026. Built from a fan-out research pass across NIST, the Ethereum Foundation, StarkWare/Starknet, Anza/Solana, Celestia/EigenDA, and academic sources (see Sources).*

---

## How to read this in one minute

Quantum computers don't "break the blockchain." They break **three specific kinds of math**, and every component below is just a place where one of those three lives:

| What quantum breaks | Algorithm | Verdict | Where it lives |
|---|---|---|---|
| **Signatures** — proving you're allowed to act (ECDSA, EdDSA/Ed25519, Schnorr, sr25519, **BLS**) | Shor | **Broken** — private key derived from public key | ~90% of every chain |
| **Encryption / key-exchange** — keeping things secret in transit (RSA, ECDH, TLS) | Shor | **Broken** — "harvest now, decrypt later" | Networking, RPC, private data |
| **Hashing** — fingerprints, proofs, Merkle trees (SHA-256, Keccak, Poseidon) | Grover | **Only dented** — quadratic speedup; bigger hashes restore it | State trees, STARK proofs, PoH |

So "quantum-proofing a component" almost always means **find the signatures (and key-exchange) and swap them for post-quantum schemes** — NIST's ML-DSA (Dilithium), SLH-DSA (SPHINCS+), FN-DSA (Falcon) for signatures, ML-KEM (Kyber) for key-exchange (FIPS 203/204/205 finalized Aug 2024; FN-DSA / FIPS 206 forthcoming). Hash-based things are mostly fine as-is.

**The one nuance that catches everyone:** a "quantum-safe proof system" does **not** make a chain quantum-safe. Starknet's STARK proofs are post-quantum secure, but Starknet *accounts* still sign with Stark-curve ECDSA, which Shor breaks — StarkWare itself says the network is *"not yet"* quantum-resistant. Keep "proof system" and "signatures" in separate boxes.

---

## The consolidated model — 5 sections

Research validated collapsing our original 11 components into **5 digestible sections** (this matches both Celestia's modular-stack framing and the Ethereum Foundation's own "four vulnerable areas" model). Each section has a technical name, a normie label, the sub-components it contains, and the crypto at risk. **No information is lost** — the 11 become labelled sub-components.

### 1. Keys & Accounts — *"Who's allowed to move money"*
- **Sub-components:** Wallets (user signing keys); Key custody (HSM, MPC/threshold, exchanges); Account abstraction, passkeys & session keys (note: passkeys use secp256r1 — still ECDSA, still breakable); Identity & naming (ENS/DID); Governance/DAO signing.
- **Crypto at risk:** Signatures (Shor). **Universal — every chain has this.**
- **Why Wallet + Key custody merged:** they're the same primitive seen twice — the private signing key. MPC and threshold custody still produce ordinary ECDSA/EdDSA signatures, so splitting the key across parties gives **no** protection against Shor (it breaks the scheme, not the split). Identity, governance and approvals all bottom out in the same account signature, so they fold in here too.

### 2. Apps & Inputs — *"The programs, and the outside data they trust"*
- **Sub-components:** On-chain signature checks (ecrecover, multisig like Safe, token approvals); Oracles (e.g., Chainlink OCR — quorum-signed reports); Randomness & VRF (Chainlink VRF; drand = threshold **BLS**; Ethereum RANDAO = **BLS** reveals; VDFs).
- **Crypto at risk:** Signatures (Shor). **Universal (apps) + common (oracles).**
- **Why this grouping:** everything here either *verifies* a signature on-chain or *provides* signed external data. Oracle and randomness keys are **shared/threshold**, so one break is **systemic** — it corrupts the feed for every downstream contract at once.

### 3. Block Production & Proving — *"How blocks get ordered, proven, and published"*
- **Sub-components:** Sequencer / leader (orders & often signs the batch); Prover & proof system; Data availability; State commitments (the state tree).
- **Crypto at risk:** **It depends on the design** — this is the section where chains differ most.
  - Proof system: **STARK/FRI = hash-based = quantum-safe ✅**; **KZG / pairing-based SNARKs (Groth16, PLONK-KZG) = Shor-vulnerable ❌** (and their *trusted setup* is retroactively forgeable by a quantum computer — see correction #2 below).
  - Data availability: **Celestia = Merkle/hash-based = safe ✅**; **EigenDA & Ethereum blobs = KZG = vulnerable ❌**.
  - State tree: **Merkle-Patricia (Keccak) = safe ✅**; **Verkle (IPA/elliptic-curve) = vulnerable ❌**.
  - Sequencer batch signature: Shor-vulnerable.
- **This whole section is architecture-specific.** It exists for rollups / validity chains (Starknet, EVM L2s, SVM rollups). **Monolithic L1s (Solana, Bitcoin, Aptos/Sui, Ethereum-as-base) don't have a separate prover or DA layer** — the block leader orders, and validators re-execute and store data themselves. When comparing a monolithic chain, mark this section "collapsed into consensus."

### 4. Consensus, Finality & Cross-chain — *"How the network agrees on truth, and how chains talk to each other"*
- **Sub-components:** Consensus / validator signatures (Ethereum **BLS12-381**; Solana **Ed25519** → BLS under Alpenglow; Cosmos/Tendermint Ed25519); Light clients & sync committees (Ethereum sync committee = **BLS**); Settlement (an L2 anchoring its proof/state to an L1); Bridges & cross-chain messaging (committee multisig / light-client verification); MEV / proposer-builder relays (BLS).
- **Crypto at risk:** Signatures (Shor). BLS aggregation is the **hardest to replace** — its "squash 500k signatures into one" property has no clean post-quantum equivalent.
- **Why these are together:** they all share one trust pattern — *"verify a set of signatures from a validator set or committee, then accept state as final."* Forge that signature set and you forge finality, forge a bridge release, or forge a light-client header. On a monolithic L1, **settlement = consensus** (there's no separate layer). Bridges are called out as their own sub-component because they're historically **crypto's most-hacked surface (~$2.8B+ in losses)**.

### 5. Networking & Confidentiality — *"The wires between the computers"*
- **Sub-components:** P2P / gossip transport (TLS, QUIC); node identity keys; RPC / API & wallet↔dapp transport (e.g., WalletConnect).
- **Crypto at risk:** Encryption / key-exchange (Shor) → **"harvest now, decrypt later."** **Universal.**
- **Note:** on a public chain the ledger is already public, so this mostly threatens *private* data — network metadata, encrypted memos, RPC traffic — plus node impersonation.

### Cross-cutting (not a section — a property over everything)
- **The exposure window.** An address is usually a *hash* of your public key, so funds are safe while untouched (hashing resists quantum). The danger starts when you transact: your public key is revealed and your transaction sits in the mempool — the window an attacker races to forge a competing transaction. **Reused / already-spent addresses are the real risk, not coins that have never moved.**
- **The migratability axis (a comparison dimension, not a component).** Can a chain rescue *already-exposed* accounts without freezing them? EdDSA chains (Solana, Aptos, Sui, Cosmos, Near) and Polkadot's hash-derived keys can migrate **in place via a seed-knowledge ZK proof** — even for exposed/dormant accounts. Bitcoin/Ethereum BIP-32 ECDSA wallets **cannot**, which is exactly why Bitcoin's BIP-361 proposal resorts to *freezing* un-migrated coins. This is a first-class axis when comparing chains.

---

## Part 1 — Commonality across EVM, SVM & Cairo

The 11 original components split into a **universal comparison spine** (present on essentially every chain) and an **architecture-specific set** (mainly rollups / validity / modular chains).

| Component | Classification | EVM (Ethereum) | SVM (Solana) | Cairo (Starknet) |
|---|---|---|---|---|
| Wallet / keys | **Universal** | secp256k1 ECDSA | Ed25519 *(address = pubkey; no hiding)* | Stark-curve ECDSA (+secp256k1/r1) |
| Smart contracts & apps | **Universal** | ecrecover, AA, multisig | program sig-checks | native account abstraction |
| Oracles & randomness | **Common** (ecosystem, not protocol-core) | Chainlink, RANDAO (BLS) | Chainlink, Switchboard | Chainlink, Pragma |
| Sequencer | **Architecture-specific** (L2) | L2 sequencers | *leader plays the role; none separate* | StarkWare sequencer |
| Prover | **Architecture-specific** (validity rollups) | ZK-L2s only | *none* | SHARP (**STARK = safe**) |
| Data availability | **Architecture-specific** (modular) | blobs/Celestia/EigenDA | *on-chain, none separate* | L1 / DA options |
| Settlement | **Architecture-specific** (L2) | *is L1 itself* | *is consensus itself* | settles to Ethereum (inherits ETH's ECDSA risk) |
| Consensus / validators | **Universal** | BLS12-381 | Ed25519 → BLS (Alpenglow) | sequencer + ETH finality |
| Bridges | **Common** | committees / light clients | committees | settlement bridge + others |
| Networking / P2P | **Universal** | devp2p/TLS | QUIC/TLS 1.3 | inherits |
| Key custody | **Universal** | HSM/MPC/exchange | HSM/MPC/Winternitz Vault | HSM/MPC/exchange |

**The takeaway for comparison:** roughly **7 components are universal** (keys, apps, oracles, consensus, bridges, networking, custody) and **4 are rollup/modular-specific** (sequencer, prover, DA, settlement). When you profile a *monolithic L1* (Solana, Bitcoin, Aptos/Sui), those 4 are "N/A — collapsed into consensus." When you profile an *L2 / validity rollup* (Starknet, EVM L2s, SVM rollups like Eclipse), all 11 apply.

### Per-ecosystem migration posture
- **Ethereum / EVM:** account abstraction (EIP-8141, "signature agility") as the per-account migration path (eyed for the Hegotá fork, H2 2026); "Lean Ethereum" collapses everything onto hash-based crypto (leanXMSS validator sigs + STARK aggregation), targeting full PQ ~2029. Dormant-fund exposure ~0.1% of supply.
- **Solana / SVM:** Anza and Firedancer independently chose **Falcon (FN-DSA)**; a seed-proof migration preserves addresses; the **Winternitz Vault** (hash-based, opt-in) exists but is niche (<300 accounts, Apr 2026) and can't pay fees. *Key weakness:* address = the raw Ed25519 public key, so every funded account is exposed today — **no "unspent = hidden" margin**.
- **Cairo / Starknet:** STARK proofs are PQ-safe; the chain is migrating its hash (Pedersen → Poseidon); **native account abstraction makes swapping accounts to Falcon unusually easy** (already demoed live via s2morrow). *But* account signatures are still Stark-curve ECDSA today, and **settlement to Ethereum re-imports Ethereum's quantum-vulnerable verification**.

### Brief divergences — other chains
- **Bitcoin:** secp256k1 ECDSA + Schnorr (Taproot). Address = hash of pubkey, so unspent/never-reused addresses are hidden until first spend; ~6–7M BTC (~30% of supply, incl. ~1.7M ancient P2PK) is exposed. PQ work: BIP-360 (P2QRH) and BIP-361 (a phased, *freeze-the-unmigrated* flag-day). Monolithic UTXO L1 — **none** of the 4 rollup components.
- **Cosmos / Tendermint (CometBFT):** Ed25519 validators, secp256k1 accounts. IBC security = on-chain light clients verifying validator signatures → directly exposed. App-chain model; no sequencer/prover/separate DA.
- **Move chains (Aptos, Sui):** Ed25519 + multi-scheme. **Best-positioned to migrate** — in-place key rotation + EdDSA seed-proof migration rescues even exposed accounts (Mysten Labs, ePrint 2025/1368); Aptos AIP-137 proposes opt-in SLH-DSA. Monolithic L1s — no rollup components.
- **Polkadot:** sr25519/Ed25519/ECDSA; BABE + GRANDPA (Ed25519). The **most concrete official PQ roadmap** of the four (Dilithium/Falcon/ML-KEM, FRI-SNARK seed-proof migration, post-quantum BEEFY bridge), though leadership frames urgency as low. Relay-chain shared security/DA present; FRI prover emerging.

---

## Part 2 — Completeness: are we missing anything?

**The 11 are conceptually sufficient.** Stress-testing a dozen candidate "missing" components found that almost all fold cleanly into the 5 sections. Two are worth **surfacing explicitly**, and three are worth adding as **notes**.

**Surface as named sub-components (were under-covered):**
1. **Light clients / sync committees** — a distinct trust model (e.g., Ethereum's 512-validator sync committee signs headers with BLS; a light client can't police them). Now explicit under Section 4. This is also exactly what trust-minimized bridges rely on, which is why bridges and light clients live together.
2. **State commitments / the state tree** — distinct from data *availability*. Merkle-Patricia (Keccak) is safe; Verkle (elliptic-curve IPA) is vulnerable. Now explicit under Section 3.

**Add as cross-cutting notes (fold, don't add a box):**
3. **The public-key exposure window** (covered above) — a property, not a component.
4. **KZG trusted-setup retroactive forgeability** — see correction #2.
5. **Account abstraction is both an exposure (secp256r1 passkeys) and the migration vehicle** (signature agility).

**Fold cleanly, no new box needed:** ENS/DIDs and governance signing (→ Keys & Accounts); paymasters, session keys, passkeys (→ Keys & Accounts, note secp256r1); RPC/TLS and WalletConnect (→ Networking); drand, VDFs (→ Apps & Inputs / randomness); MEV-Boost / PBS relays (→ Consensus); HSM / MPC / TSS custody (→ Keys & Accounts).

---

## Part 3 — Correctness, consistency & overlap review

**Core cryptographic claims: verified and consistent** across four independent research streams and primary sources (NIST, ethereum.org, StarkWare, Anza, academic papers). Confirmed: STARK/FRI is hash-based and post-quantum secure; KZG and BLS are pairing-based and Shor-vulnerable; Grover only quadratically weakens hashes (256-bit → ~128-bit, restored by larger output); Ed25519/secp256k1/Stark-curve are all Shor-vulnerable.

**Overlaps found → merges made:**
- **Wallet + Key custody → merged** ("Keys & Accounts"). Same primitive (the signing key); MPC/HSM/threshold don't change the Shor exposure.
- **Settlement + Consensus → merged on L1, kept distinct only for L2s.** On a monolithic chain, settlement *is* finality; "Settlement" is meaningful only as an L2-anchors-to-L1 step.
- **Bridges + Light clients + Settlement → grouped** under one "verify a foreign signing set" theme (Section 4).
- **Oracles vs Apps → kept distinct** (oracles add new *external, shared* signing keys), but housed in the same section.

**Two corrections to the original infographic (important):**
1. **"Data availability = KZG = breakable" is only half-true.** Celestia's DA is **Merkle/hash-based (NMT + Reed-Solomon + sampling) — quantum-safe**. Only **EigenDA and Ethereum blobs use KZG** and are vulnerable. DA should be marked **"depends on design,"** not uniformly breakable.
2. **Prover is "depends on the proof system," not uniformly safe.** STARK provers are safe; **KZG/pairing-based SNARK provers are vulnerable** — and the common claim that a trusted-setup ceremony is "safe forever if one participant was honest" is **false against a quantum adversary**, who can recover the secret from the public parameters and forge proofs with a classical computer thereafter. The original infographic marked Prover "SAFE" — correct *for Starknet* (STARK), but in a general framework it's conditional.

**Net:** the model is internally consistent once (a) the 11 are grouped into 5, (b) DA and Prover are marked "depends on design," and (c) Settlement is treated as an L2-only refinement of Consensus.

---

## Applying the framework to any chain (comparison template)

For each chain, fill in a row per section:

| Section | Scheme(s) used | Shor / Grover / Safe | Migration path | In-place rescue of exposed accounts? |
|---|---|---|---|---|
| 1. Keys & Accounts | | | | |
| 2. Apps & Inputs | | | | |
| 3. Block Production & Proving *(or "monolithic — N/A")* | | | | |
| 4. Consensus, Finality & Cross-chain | | | | |
| 5. Networking & Confidentiality | | | | |

Recommended scoring axes: **(1)** how much of the stack is signatures vs hash-based; **(2)** is the proof system STARK (safe) or KZG (vulnerable); **(3)** can accounts migrate via account abstraction / signature agility; **(4)** can *already-exposed* funds be rescued without freezing; **(5)** how concrete is the official roadmap.

---

## Confidence flags

- **High (primary-sourced, cross-corroborated):** all the Shor/Grover verdicts; NIST FIPS 203/204/205 (Aug 2024); STARK PQ-safety; Solana address = pubkey; Celestia DA is hash-based; bridge loss totals; the EdDSA-vs-BIP32 migratability split.
- **Medium (directional / may evolve):** Ethereum's pivot from Verkle to hash-based binary trees (real direction, not a single ratified cancellation); exact Chainlink signing scheme labels; specific bridge curves.
- **Roadmap / uncertain by nature:** all dates (EIP-8141 H2 2026, Lean Ethereum ~2029, Solana Alpenglow late 2026); Q-Day timing; FN-DSA / FIPS 206 finalization.

---

## Sources

**Standards & threat model**
- NIST — First 3 Finalized Post-Quantum Encryption Standards (FIPS 203/204/205) — https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards
- Federal Register — Issuance of FIPS 203/204/205 — https://www.federalregister.gov/documents/2024/08/14/2024-17956/
- Shor's discrete-log algorithm for elliptic curves — https://arxiv.org/abs/quant-ph/0301141
- Estimating quantum pre-image attacks on SHA-2/SHA-3 (Grover) — https://arxiv.org/pdf/1603.09383
- Quantum Computers Are Not a Threat to 128-bit Symmetric Keys (Valsorda) — https://words.filippo.io/128-bits/
- Google Quantum AI — Safeguarding cryptocurrency by disclosing quantum vulnerabilities responsibly — https://research.google/blog/safeguarding-cryptocurrency-by-disclosing-quantum-vulnerabilities-responsibly/

**Ethereum / EVM**
- Post-quantum cryptography on Ethereum (roadmap) — https://ethereum.org/roadmap/future-proofing/quantum-resistance/
- pq.ethereum.org (EF Post-Quantum team) — https://pq.ethereum.org/
- lean Ethereum (Justin Drake, EF blog, 2025-07-31) — https://blog.ethereum.org/2025/07/31/lean-ethereum
- Vitalik — How to hard-fork in a quantum emergency (2024-03-09) — https://ethresear.ch/t/how-to-hard-fork-to-save-most-users-funds-in-a-quantum-emergency/18901
- Vitalik — "The Verge" (Verkle vs binary trees, 2024-10-23) — https://vitalik.eth.limo/general/2024/10/23/futures4.html
- Hash-Based Multi-Signatures for Post-Quantum Ethereum (IACR 2025/055) — https://eprint.iacr.org/2025/055.pdf
- EIP-4844 (KZG blobs) — https://www.eip4844.com/

**Solana / SVM**
- Securing Solana Against a Powerful Quantum Adversary (Anza, 2026-04-27) — https://www.anza.xyz/blog/securing-solana-against-a-powerful-quantum-adversary
- Solana's Quantum Readiness (Solana Foundation) — https://solana.com/news/quantum-readiness
- Account Structure (address = Ed25519 pubkey) — https://solana.com/docs/core/accounts/account-structure
- Quantum-Proofing Solana / Winternitz Vault (Blueshift) — https://blueshift.gg/research/quantum-proofing-solana
- Alpenglow (BLS votes, Rotor/Votor) — https://www.helius.dev/blog/alpenglow

**Cairo / Starknet**
- Quantum Computing Is Coming: Is Starknet Prepared? (StarkWare, 2024-12) — https://starkware.co/blog/quantum-computing-is-starknet-prepared/
- Bitcoin Security in the Age of Quantum Computing (Starknet, 2025-11) — https://www.starknet.io/blog/bitcoin-quantum-security-with-starks/
- Cryptography — Starknet docs (Stark curve, Pedersen/Poseidon) — https://docs.starknet.io/learn/protocol/cryptography
- Scalable, transparent, and post-quantum secure computational integrity (STARK paper, 2018/046) — https://eprint.iacr.org/2018/046.pdf
- Solidity verifier — Starknet docs (settlement) — https://docs.starknet.io/architecture-and-concepts/solidity-verifier/
- Falcon-512 on Starknet (s2morrow demo) — https://www.s2morrow.xyz/

**Bridges, oracles, DA, other chains**
- The modular stack (Celestia) — https://celestia.org/learn/intermediates/the-modular-stack/
- Celestia data availability (NMT, hash-based) — https://docs.celestia.org/learn/celestia-101/data-availability/
- EigenDA overview (KZG + BLS) — https://docs.eigencloud.xyz/products/eigenda/core-concepts/overview
- Chainlink OCR — https://research.chain.link/ocr.pdf
- drand cryptography (threshold BLS) — https://drand.love/docs/security-model/
- eth2book — RANDAO & VDF status — https://eth2book.info/latest/part2/building_blocks/randomness/
- Post-Quantum Readiness in EdDSA Chains (Mysten Labs, IACR 2025/1368) — https://eprint.iacr.org/2025/1368
- Post-Quantum Cryptography Roadmap for Polkadot and JAM (Web3 Foundation, 2025-06) — https://forum.polkadot.network/t/post-quantum-cryptography-roadmap-for-polkadot-and-jam/13232
- BIP-361 / phased Bitcoin migration (qbip.org) — https://qbip.org/
- A Comprehensive Review of Quantum-Resistant Architectures for Blockchain Security (MDPI) — https://www.mdpi.com/2413-4155/8/2/47
