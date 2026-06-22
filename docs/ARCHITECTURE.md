# Rig Runner — Network Model & Architecture (Mock Testnet, v0.1)

## 0. One-sentence model

GPUs do virtual **work** → work accrues **decaying stake-weight** → each block's
reward is split across validators by their **share of total stake-weight**, minus
**commission** — all settled into a **mock database**, behind an interface a real
Tendermint/Cosmos testnet can replace later.

This is "Proof of Useful Work-backed Stake": Proof of Work is the *weight-generation*
layer; Proof of Stake is the *settlement* layer. The PoW is deliberately masked as
stake so real Tendermint mechanics (delegation, validators, commission, slashing,
unbonding) can be grafted on without redesigning the economy.

---

## 1. Why this resolves the PoW/PoS contradiction

- Real GPU mining is **Proof of Work** (hashrate races for blocks).
- Tendermint is **Proof of Stake** (stake chooses block proposers; no mining).
- Bridging them: hashrate is not spent racing for blocks — it is **converted into
  stake-weight**. You "mine your way into stake." Settlement is then pure PoS.
- Result: the rig stays meaningful (it is *how you earn weight*), while the ledger
  is Tendermint-compatible.

---

## 2. Core entities (the mock database schema)

The mock DB is a single JSON document with these tables. Every field is something a
real chain would expose, so the dashboards read "real" shapes.

### 2.1 `network` (singleton)
| field | type | meaning |
|---|---|---|
| `chainId` | string | e.g. `rigrunner-testnet-1` |
| `height` | int | current block height |
| `blockTimeSec` | int | target seconds per block (e.g. 6, Tendermint-like) |
| `baseBlockReward` | number | $HASH minted per block before split |
| `decayHalfLifeSec` | int | half-life of idle stake-weight decay |
| `weightPerHashSec` | number | conversion: 1 H/s sustained for 1s → this much raw weight |
| `bondedWeight` | number | sum of all validators' current stake-weight |
| `lastBlockAt` | epoch ms | timestamp of last produced block |

### 2.2 `validators` (3–7 rows; one is the player)
| field | type | meaning |
|---|---|---|
| `id` | string | `val_player`, `val_npc_1`, … |
| `moniker` | string | display name ("Dorm Rig", "Hashery", …) |
| `isPlayer` | bool | true for the player's node |
| `hashRate` | number | current H/s the node is producing |
| `stakeWeight` | number | current (decaying) stake-weight |
| `commissionRate` | number | 0–1, validator's cut of its delegators' rewards |
| `selfBalance` | number | $HASH the validator has earned (commission + self-stake share) |
| `delegatorPool` | number | $HASH notionally owed to delegators |
| `uptime` | number | 0–1, fraction of recent blocks signed (flavor + slashing hook) |
| `jailed` | bool | slashing/jail hook (unused in v0.1, reserved) |

### 2.3 `blocks` (append-only log, capped to last N for the explorer)
| field | type | meaning |
|---|---|---|
| `height` | int | block number |
| `time` | epoch ms | when produced |
| `proposer` | string | validator id chosen to propose (weighted random) |
| `reward` | number | total minted this block |
| `txCount` | int | mock transaction count (flavor) |
| `hash` | string | mock block hash (deterministic from height+time) |
| `distribution` | map | validatorId → reward credited this block |

### 2.4 `account` (the player's wallet view)
| field | type | meaning |
|---|---|---|
| `balance` | number | spendable $HASH (mirrors validator.selfBalance for player) |
| `pendingRewards` | number | accrued-but-unclaimed (optional in v0.1) |

---

## 3. The math

### 3.1 Work → raw weight
Each second a node hashes, it earns raw weight:
```
rawWeightGain = hashRate * weightPerHashSec * dtSeconds
```

### 3.2 Decay (the "must keep mining" rule)
Stake-weight decays continuously toward zero with a half-life. Over `dt` seconds:
```
decayFactor = 0.5 ** (dt / decayHalfLifeSec)
stakeWeight = stakeWeight * decayFactor + rawWeightGain
```
- If the rig keeps producing, gains outpace decay → weight stabilizes at an
  equilibrium proportional to hashRate.
- If the rig goes idle (hashRate = 0), weight halves every `decayHalfLifeSec` →
  the node bleeds influence and reward share. This is what forces ongoing play.
- **Equilibrium weight** for a constant hashRate H:
  `W* ≈ H * weightPerHashSec * decayHalfLifeSec / ln(2)` (geometric-series limit).
  This gives us a clean dial: pick the equilibrium you want, solve for the constants.

### 3.3 Block production (PoS proposer selection)
Every `blockTimeSec`, one validator is chosen to **propose**, weighted by stake:
```
P(validator i proposes) = stakeWeight_i / bondedWeight
```
(Tendermint-style weighted round-robin; we use weighted-random for the mock.)

### 3.4 Reward split (validator economics)
The block reward is **distributed across all validators by stake-share** (not only to
the proposer — this matches Cosmos fee/reward distribution where the proposer gets a
small bonus and the rest is shared by voting power). For v0.1:
```
share_i      = stakeWeight_i / bondedWeight
gross_i      = baseBlockReward * share_i
commission_i = gross_i * commissionRate_i      // to validator's own balance
delegated_i  = gross_i - commission_i           // to delegator pool
```
Player's spendable balance grows by `commission_player + (player's self-stake share)`.
In v0.1 the player is treated as self-delegated, so player gains the full `gross_player`.

### 3.5 Proposer bonus (optional, on by default)
The chosen proposer gets a small flat bonus on top (e.g. +5% of base reward) to make
"who proposed" matter in the explorer. Tunable; can be 0.

---

## 4. The tick loop (what the simulator does each step)

```
on each simulated second (or catch-up after offline):
  1. for every validator: apply decay + add rawWeightGain  (§3.1, §3.2)
  2. recompute network.bondedWeight = Σ stakeWeight
  3. if (now - lastBlockAt) >= blockTimeSec:
       a. pick proposer weighted by stakeWeight            (§3.3)
       b. compute per-validator distribution               (§3.4, §3.5)
       c. credit balances + delegator pools
       d. append a block row; bump height; set lastBlockAt
  4. persist mock DB
```

Offline catch-up: on load, compute elapsed seconds and fast-forward the loop (capped,
e.g. 24h) so the chain "kept running" while the app was closed — but capped so a
year-away return doesn't mint absurd supply. Mirrors the existing economy clock.

---

## 5. Screens to emulate (node-operator UX)

### 5.1 Validator Dashboard (the player's node)
- Node identity: moniker, validator address, status (Active/Jailed), uptime.
- **Voting power**: player stakeWeight, and **% of network** (the headline number).
- Live hashRate (from the rig) and the **weight equilibrium** it's trending toward.
- Earnings: balance, commission rate, last-block reward, rewards/min estimate.
- A small sparkline of voting-power share over recent blocks.
- "Decay warning" if hashRate drops and weight is bleeding.

### 5.2 Block Explorer (the network)
- Network header: chainId, height, block time, bonded weight, block reward.
- **Validator set table**: all nodes ranked by voting power, with share %, commission,
  uptime, and a highlight on the player's row.
- **Latest blocks** feed: height, time, proposer (moniker), reward, tx count, hash —
  newest first, updating live as blocks are produced.
- Click a block → its per-validator reward distribution.

---

## 6. Interface seam for the real testnet (future)

All reads go through a thin `ChainSource` interface:
```
getNetwork() -> network
getValidators() -> validator[]
getLatestBlocks(n) -> block[]
getAccount() -> account
```
v0.1 implements this over the mock DB. A future `TendermintChainSource` implements the
same four methods over a real RPC (e.g. `/status`, `/validators`, `/block`), and the
dashboards don't change. **This is the whole point of mocking to a database first:**
the UI and the economy are built against the interface, not the mock.

### Mapping to real Tendermint/Cosmos (when we get there)
| mock concept | real Tendermint/Cosmos analog |
|---|---|
| validator.stakeWeight | validator voting power (bonded tokens) |
| work→weight conversion | a custom staking module / "useful-work" minting |
| decay | custom unbonding/decay logic (non-standard; our twist) |
| baseBlockReward split | `distribution` module (proposer bonus + power-weighted) |
| commissionRate | validator commission |
| proposer selection | Tendermint weighted round-robin |
| jailed/uptime | slashing module |

---

## 7. What's intentionally deferred (the to-do list)

- **Real deployment** of a Tendermint/Cosmos testnet (this is mock-only by design).
- **Delegation by others** (delegator pool exists but no external delegators yet).
- **Slashing/jail** mechanics (fields reserved, logic not implemented in v0.1).
- **Unbonding periods** for weight.
- **Multiple rigs / multiple player validators**.
- **Transactions** beyond a mock count (no real mempool).
- Tuning pass on constants once it "feels" right in play.

---

## 8. Default constants (first pass, tunable)

| constant | value | rationale |
|---|---|---|
| chainId | `rigrunner-testnet-1` | — |
| blockTimeSec | 6 | Tendermint-typical |
| baseBlockReward | 5 $HASH | readable numbers |
| decayHalfLifeSec | 3600 (1h) | idle for an hour → half weight; forgiving but real |
| weightPerHashSec | 1 / 3600 | so weight is "hash-hours"; equilibrium W* = H * halfLife/ln2 |
| proposerBonusPct | 0.05 | proposer matters a little |
| validators | 5 | player + 4 NPCs |
| player commission | 0.10 | 10% |

With these, the player's 3,300 H/s rig trends to an equilibrium weight of
`3300 * (1/3600) * 3600 / ln(2) ≈ 4,760` weight units — a clean, legible headline
number, and directly comparable to the NPC validators' weights.
