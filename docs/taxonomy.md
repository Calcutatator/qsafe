# Quantum-Proofing Blockchains — Component Taxonomy (v2)

*Three tiers, each more granular: **Core Section** (fixed, high-level — "quantum-resistant or not" at a glance) → **Subsection** (a discrete component: concise label + one-line meaning) → **Description** (what it is, briefly, then what it takes to be quantum-proof).*

*v2 — subsections verified, merged, expanded, and fact-checked via a second deep-research pass (June 2026). The 5 core sections are unchanged, and **no new core section is required**: every component found maps into the existing five. Companion: `quantum-proofing-framework.md` (research + rationale + sources).*

---

## The lens (applies to every subsection)

Quantum breaks three kinds of math. The single most common culprit across components is **pairing-based crypto** (BLS, KZG) — it shows up in consensus, proofs, DA, bridges, and more.

- **❌ Signatures** (ECDSA, EdDSA, Schnorr, sr25519, **BLS**) → Shor breaks them. *Fix: a NIST PQ signature — ML-DSA / FIPS 204 and SLH-DSA / FIPS 205 (both finalized 2024); FN-DSA / Falcon (FIPS 206, still draft in 2026).*
- **❌ Encryption / key-exchange** (RSA, ECDH, TLS, IBE) → Shor breaks them; "harvest now, decrypt later." *Fix: ML-KEM / FIPS 203 (Kyber), e.g. hybrid X25519MLKEM768 — already rolling out across the internet.*
- **✅ Hashing** (SHA-256, Keccak) → Grover only, and it barely parallelizes — standard 256-bit hashes stay safe with no swap. *Caveat: Poseidon and other young ZK-hashes are likely fine quantum-wise but their classical algebraic cryptanalysis is still maturing — watch, don't assume.*
- **⚠️ Depends** → the component can be built hash-based (safe) **or** pairing/EC-based (breakable); the design choice decides it.

### How to apply per chain
Walk every subsection for a given chain/product and record: **scheme used → ❌ breakable / ✅ safe / ⚠️ depends → N/A** where the component doesn't exist (e.g., a monolithic L1 has no separate prover or DA). The "what it takes to be quantum-proof" line is the bar each component must clear. Two scoring axes worth carrying: *is the proof/commitment hash-based or pairing-based*, and *can already-exposed accounts migrate in place or must they be frozen*.

---

## 1. Keys & Accounts — *"Who's allowed to move money"*
**At a glance: ❌ Breakable (signatures). Universal — every chain has it.**

**1.1 Account signing keys** — *the key that authorizes spending.*
The user's private key that signs transactions. **Quantum-proof:** sign with a PQ scheme (ML-DSA / SLH-DSA; Falcon when finalized) instead of ECDSA/EdDSA/Stark-curve — usually enabled per-account via account abstraction. → ❌ Signatures

**1.2 Key custody & storage** — *where the private key lives.*
Self-custody, hardware wallet, HSM, or exchange. **Quantum-proof:** the stored key is a PQ key and the signer hardware/firmware can produce PQ signatures. → ❌ Signatures

**1.3 MPC / threshold signing** — *one key split across several parties.*
Distributed signers jointly produce a single signature (institutional custody, smart wallets). **Quantum-proof:** a threshold scheme over PQ primitives — **research-stage** (NIST IR 8214C is still collecting candidates; e.g. distributed ML-DSA). Splitting a classical key gives **no** quantum protection. → ❌ Signatures

**1.4 Account abstraction / smart accounts** — *programmable account validation.*
Accounts whose verification logic is code (ERC-4337, native AA). **Quantum-proof:** implement a PQ-signature verifier — *this is the main migration vehicle*, letting an account swap schemes with no L1 hard fork. → ❌ Signatures (but the upgrade path)

**1.5 Passkeys / session keys** — *device-bound or delegated keys.*
WebAuthn passkeys (secp256r1 / P-256) and short-lived session keys. **Quantum-proof:** PQ-capable authenticators or a PQ verifier in the account — P-256 is still Shor-broken. → ❌ Signatures

**1.6 Identity & naming** — *names and IDs bound to an account.*
ENS, DIDs, verifiable credentials. **Quantum-proof:** mostly inherits the controlling account's signature (safe once that account is PQ); where pairing-based credentials (BBS+) are used, they need PQ replacements. → ❌ Inherited

**1.7 Governance & voting** — *authorizing protocol and treasury decisions.*
On-chain votes/delegations and off-chain signed messages (Snapshot). **Quantum-proof:** voting authorization uses PQ account signatures. → ❌ Signatures

**Notes**
- **Exposure window:** an address is usually a *hash* of the public key — untouched funds are safe; transacting reveals the key. Reused / already-spent addresses are the real risk. *Exception:* Solana addresses **are** the raw Ed25519 public key, so every funded account is exposed today.
- **Migratability axis:** EdDSA chains (Solana, Aptos, Sui, Cosmos) + Polkadot can rescue *already-exposed* accounts in place via a seed-knowledge ZK proof; Bitcoin/Ethereum BIP-32 ECDSA wallets cannot, so their fallback is freezing un-migrated coins.
- Schemes today: EVM = secp256k1 ECDSA · Solana = Ed25519 · Starknet = Stark-curve ECDSA.

---

## 2. Apps & Inputs — *"The programs, and the outside data they trust"*
**At a glance: ❌ Breakable (signatures + pairings); shared keys make breaks systemic. Universal (apps) + common (oracles).**

**2.1 Smart-contract signature verification** — *contracts that check signatures.*
On-chain ECDSA checks via `ecrecover`, EIP-712 permits/approvals, and N-of-M multisig contracts (e.g., Safe). **Quantum-proof:** PQ-signature precompiles/verifiers, and contracts that don't hardcode ECDSA. → ❌ Signatures

**2.2 On-chain proof & pairing verifiers** — *contracts that verify ZK proofs or pairings.*
EVM pairing precompiles (BN254 / EIP-196-197, BLS12-381 / EIP-2537) and the Groth16/PLONK-KZG verifier contracts that use them. **Quantum-proof:** verify hash-based proofs (STARK/FRI — Grover-only) or lattice-based proofs instead of pairing SNARKs. → ❌ Pairings

**2.3 Oracles & external data feeds** — *signed off-chain data brought on-chain.*
Price/data feeds signed by operators (e.g., Chainlink OCR — quorum-aggregated ECDSA). **Quantum-proof:** reports signed/aggregated with PQ schemes. *Shared keys → one break corrupts every downstream consumer at once.* → ❌ Signatures

**2.4 Verifiable randomness & beacons** — *on-chain randomness with a proof.*
VRFs (Chainlink VRF = EC-based) and threshold beacons (drand = threshold BLS). **Quantum-proof:** PQ VRFs are **research-stage** (lattice/hash/isogeny, none standardized); the robust option today is hash **commit-reveal** (RANDAO-style), which is quantum-safe. → ❌ Signatures

**2.5 Time-based ordering / VDF** — *a forced delay for fair or unbiased ordering.*
Verifiable delay functions. **Quantum-proof:** only **hash-based / sequential** VDFs are a genuine PQ candidate (with weaker verification efficiency). **RSA-group VDFs are Shor-broken, and class-group VDFs are NOT quantum-resistant** (a quantum computer computes the group order) — they offer only "quantum annoyance." A fully efficient PQ VDF is an open problem. → ⚠️ Depends (mostly breakable)

**Notes**
- Commit-reveal commitments: hash-based (safe, if "collapsing") vs Pedersen/EC (breakable).
- Solana's Proof of History is a SHA-256 hash chain (Grover-only, safe) — *not* a Shor-exposed VDF; don't conflate them.

---

## 3. Block Production & Proving — *"How blocks get ordered, proven, and published"*
**At a glance: ⚠️ Depends — the design decides it. Architecture-specific: monolithic L1s mark most rows N/A.**

**3.1 Sequencing & ordering** — *who orders transactions into blocks.*
An L2 sequencer or L1 leader/proposer orders and usually signs the batch. **Quantum-proof:** the batch/block signing key is PQ. *(Monolithic L1 → this is the leader, see §4; a separate sequencer = N/A.)* → ❌ Signatures

**3.2 Proof system** — *the proof that execution was done correctly.*
Validity/fraud proofs of state transitions. **Quantum-proof:** use a hash-based system (STARK/FRI = ✅); pairing SNARKs (Groth16, PLONK-KZG) are Shor-broken (❌); lattice polynomial commitments are an emerging PQ alternative. → ⚠️ Depends

**3.3 Trusted setup** — *a one-time ceremony some proof systems need.*
Powers-of-tau / KZG structured reference string. **Quantum-proof:** use a **transparent** setup (STARKs need none). KZG setups are quantum-exposed: Shor recovers the secret from the *public* parameters regardless of honest deletion (deletion protected the ceremony, not the EC-encoded SRS) — impact is forged proofs/DA, not execution rules. → ⚠️ Depends / N/A if transparent

**3.4 Data-availability commitment** — *proof that block data was actually published.*
The commitment letting anyone reconstruct state. **Quantum-proof:** hash-based commitment (Merkle / Namespaced Merkle Trees, e.g. Celestia = ✅); KZG-based DA (Ethereum blobs, EigenDA, Avail) is Shor-broken (❌). → ⚠️ Depends

**3.5 State commitment** — *the accumulator committing to all chain state.*
The state tree. **Quantum-proof:** hash-based tree (Merkle-Patricia, binary Merkle = ✅); EC vector commitments (Verkle/IPA) are breakable (❌) — Ethereum is pivoting to a hash-based binary tree (EIP-7864) partly for this reason. → ⚠️ Depends

**3.6 Execution / VM** — *running the transactions themselves.*
The virtual machine executing logic. **Quantum-proof:** nothing of its own — it's logic, not cryptography (signature/pairing checks belong to §2). → ✅ Safe

**Notes**
- This whole section exists for rollups / validity / modular chains. **Monolithic L1s (Solana, Bitcoin, Aptos/Sui) → proof system, trusted setup, DA commitment = N/A.**
- **KZG and pairings are the recurring vulnerability** here; STARK provers are PQ-safe by construction.
- Poseidon/ZK-hash caveat applies to hash-based trees and proofs (classical cryptanalysis still maturing).

---

## 4. Consensus, Finality & Cross-chain — *"How the network agrees, and how chains talk"*
**At a glance: ❌ Breakable (signatures); BLS aggregation is the hardest piece to replace. Consensus universal; the rest common-to-conditional.**

**4.1 Consensus, finality & proposer signatures** — *signatures that agree on and finalize blocks.*
Validator votes/attestations, finality-gadget votes (Casper FFG = BLS, GRANDPA = Ed25519, BEEFY = ECDSA), and proposer/leader authentication. **Quantum-proof:** PQ validator signatures **plus a PQ way to aggregate them** — BLS aggregation has no clean drop-in analog, so the path is hash-based signatures aggregated via a SNARK (prototype-stage, e.g. Ethereum's leanSig). → ❌ Signatures

**4.2 Light clients & sync committees** — *cheap verification of another chain's headers.*
A small signing set whose headers light clients trust (Ethereum sync committee = BLS). **Quantum-proof:** PQ header signatures, or hash-based / STARK consensus proofs. → ❌ Signatures

**4.3 Settlement / L1 anchoring** — *an L2 posting its proof/state to a base chain.*
The L2's canonical bridge — L1 verifier contract + operator authorization. **Quantum-proof:** PQ verifier + operator keys; note it **inherits the base chain's crypto** (e.g., Starknet settling to Ethereum re-imports Ethereum's ECDSA). *(Monolithic L1 → N/A; settlement = its own consensus.)* → ❌ Signatures / inherited

**4.4 Bridges & cross-chain messaging** — *moving assets and messages across chains.*
External committees / MPC (Wormhole, LayerZero) or light-client verification (IBC). **Quantum-proof:** PQ committee signatures or PQ light-client verification. *Crypto's most-hacked surface (~$2.8B+).* → ❌ Signatures

**4.5 Restaking / AVS attestations** — *borrowed security from a restaked operator set.*
Operators (EigenLayer, Symbiotic) sign attestations securing off-chain services, usually with BLS. **Quantum-proof:** PQ operator signatures. *(Often N/A.)* → ❌ Signatures

**4.6 Payment channels & conditional transfers** — *off-chain transfers and cross-chain swaps.*
HTLCs / Lightning, adaptor signatures, atomic swaps (ECDSA/Schnorr + hash preimages / discrete-log extraction). **Quantum-proof:** PQ signatures, and the base chain must support them — these can't migrate without the L1's signature upgrade. *(Often N/A.)* → ❌ Signatures

**4.7 MEV / builder-relay (PBS)** — *the block-building market's signatures.*
MEV-Boost relays, builder/proposer commitments. **Quantum-proof:** PQ relay/builder/proposer signatures. *(Often N/A.)* → ❌ Signatures

**Notes**
- Shared trust pattern across this whole section: *verify a set of signatures from a validator set or committee, then accept state.* Forge that set → forge finality, a bridge release, or a light-client header.
- BLS's "squash 500k signatures into one" property has no clean PQ analog — replacing it is the single biggest consensus-layer lift.
- BEEFY deliberately uses ECDSA (not BLS) for cheap bridge/light-client verification — a distinct cross-chain surface.

---

## 5. Networking & Confidentiality — *"The wires between the computers"*
**At a glance: ❌ Breakable (key-exchange/encryption); "harvest now, decrypt later." Universal.**

**5.1 Node-to-node transport (P2P)** — *encrypted links between nodes.*
TLS / QUIC / Noise gossip channels. **Quantum-proof:** PQ / hybrid key-exchange (ML-KEM, e.g. X25519MLKEM768 — already deploying across the internet). → ❌ Encryption (HNDL)

**5.2 Node identity keys** — *keys that identify peers and validators.*
libp2p peer IDs, validator network identity. **Quantum-proof:** PQ node identity keys. → ❌ Signatures

**5.3 RPC / API & client transport** — *wallet/dapp ↔ node connections.*
HTTPS/TLS to RPC providers, WalletConnect relays. **Quantum-proof:** PQ / hybrid TLS on RPC endpoints and relays. → ❌ Encryption (HNDL)

**5.4 On-chain key agreement & stealth addresses** — *shared secrets derived on-chain.*
ECDH-based stealth addresses (ERC-5564) and similar key agreement. **Quantum-proof:** PQ key-encapsulation (ML-KEM); note HNDL here **retroactively de-anonymizes** past activity once the curve breaks. → ❌ Encryption (HNDL)

**5.5 Application-layer encryption & privacy** — *encrypted data, memos, and private-tx systems.*
Encrypted mempools / threshold-encrypted ordering (e.g., Shutter = pairing-based IBE + DKG), privacy chains, off-chain encrypted stores. **Quantum-proof:** PQ encryption / threshold schemes — note FHE-based privacy (lattice) is **already** PQ, though pairing-SNARK wrappers and threshold-decryption committees may not be. → ❌ Encryption (HNDL)

**Notes**
- A public ledger's data isn't secret, so HNDL mainly threatens *private* data, transport, node impersonation, and retroactive de-anonymization.
- This layer migrates alongside the broader PQ-TLS rollout, not via chain-specific consensus changes.

---

## Quick reference — what "quantum-proof" means, by primitive

| If a subsection relies on… | It is… | Replace with… | Maturity |
|---|---|---|---|
| ECDSA / EdDSA / Schnorr / sr25519 | ❌ Breakable | ML-DSA (FIPS 204), SLH-DSA (FIPS 205), Falcon (FIPS 206 draft) | Standardized (Falcon pending) |
| BLS signatures / aggregation | ❌ Breakable | Hash-based sigs + SNARK aggregation (no drop-in analog) | Prototype |
| KZG / pairing SNARKs / pairing precompiles | ❌ Breakable | STARK/FRI (hash) or lattice commitments; transparent setup | STARK deployed; lattice research |
| RSA / ECDH / TLS / IBE (transport, stealth, encrypted mempool) | ❌ Breakable | ML-KEM (Kyber), hybrid PQ-TLS | Deployed |
| Threshold/MPC signing · PQ VRF · efficient VDF | ❌ Breakable | Threshold-PQ / PQ-VRF / hash-VDF | Research-stage |
| SHA-256 / Keccak (and, with care, ZK-hashes) | ✅ Safe at size | No swap — Grover doesn't parallelize | N/A |

*All classifications are sourced in `quantum-proofing-framework.md`.*

---

## Revision notes (v1 → v2)

- **Merged (conciseness):** on-chain sig-checks + multisig → **2.1**; validator + proposer auth + finality gadgets → **4.1**; VRF + randomness beacons/DKG → **2.4**.
- **Added (genuine gaps, all map to existing cores):** on-chain proof & pairing verifiers (**2.2**); restaking/AVS attestations (**4.5**); payment channels & conditional transfers (**4.6**); on-chain key agreement & stealth addresses (**5.4**); application-layer encryption & privacy broadened to absorb encrypted mempools (**5.5**).
- **Accuracy fixes:** VDF corrected (class-group VDFs are *not* quantum-resistant); MPC/threshold and PQ-VRF marked research-stage; trusted-setup framing tightened (Shor recovers the secret from the public SRS regardless of honest deletion; impact bounded to proofs/DA); Falcon/FN-DSA noted as still-draft; ML-KEM naming + real-world deployment; Grover/Poseidon nuance (256-bit hashes comfortably safe; young ZK-hashes need classical-cryptanalysis caution).
- **Cores unchanged.** No finding required a new core section — confidentiality gaps land in §5, finality/restaking/channels in §4, verifiers in §2.
