# Changelog

All notable changes to Rig Runner / *Miner's Life* are tracked here.
Format loosely follows Keep a Changelog. Dates are YYYY-MM-DD.

## [0.3.1] — 2026-06-22

### Fixed
- **Won blocks showed 0 BBT earned.** Root cause: the chain anchors to a fixed
  genesis, so by playtime the block height was already ~1.5M. Combined with the
  50,000-block (BTC-style) halving, the reward had halved ~29 times down to
  ~0.000000009 BBT — effectively zero. Fixed two ways:
  - Moved the shared genesis to a fixed **2026-06-01** (height now ~190k instead
    of ~1.5M), still uniform across all players.
  - Lengthened the halving interval to **~4 years** (12,614,400 blocks at 10s),
    matching Bitcoin's cadence, so the reward stays a full **5 BBT** for years
    rather than decaying within weeks.
  - Save key bumped to `v0_3_1` so the corrected genesis/reward take effect (old
    saves carried the broken chain state).
- **Mining console showed a hardcoded pool** instead of the selected pool. The
  console now reflects the real mining target everywhere (boot/connect lines,
  "new job" lines, shutdown, title bar, footer), and shows a distinct solo
  endpoint when solo mining.

### Changed
- **Changing the pool now restarts the rig** (real miners must reconnect):
  switching pools (or to/from solo) bounces a running rig through STARTUP so the
  console replays the boot/DAG sequence under the new pool. Switching also flushes
  pending pool earnings to balance first.

## [0.3] — 2026-06-22

Scales the network to real-world early-Ethereum economics and adds an 8-pool
mining ecosystem with a solo-vs-pool risk/reward choice.

### Added
- **Real-world network scale** (anchored to late-2015 Ethereum): ETH ~$3.15,
  5 ETH/block, 10s blocks, a 6-card ~168 MH/s rig earning ~$1,800/mo ⇒ the player
  is **~0.044% of a ~381 GH/s global network** (verified against historical
  early-Frontier hashrate). Solo mining is a genuine long-shot.
- **8 mining pools** with realistic names, stratum hosts/ports, and fees:
  Dwarfpool, Ethermine, F2Pool, Nanopool, ethpool, MiningPoolHub, Coinotron,
  Suprnova. Pools hold ~85% of global hashrate (largest ~20.5%, smallest ~6% of
  global); the remaining ~15% is the solo/independent field that includes the
  player.
- **Pool selector** on each rig's settings (dropdown: Solo + the 8 pools, showing
  fee and network share).
- **Solo vs. pool risk/reward**: solo is winner-take-all (brutal variance, no
  fees); pools pay a steady share of the pool's wins every ~15 minutes, minus the
  pool fee. **Smaller pools charge lower fees**, so they genuinely net more per
  unit hash — but win less often, so payouts are lumpier. Expected value before
  fees is identical everywhere; fees + variance are the real differentiators.
- **~15-minute pool payout windows** (slows reward flow, as intended for the
  future shop/upgrade economy).

### Changed
- Hashrate is now measured in **MH/s** throughout (a card ~28 MH/s, a 6-card rig
  ~168 MH/s) to match real scale.
- **Network model replaced**: the old 5-validator PoS-style set is gone. The
  network is now 8 pools + a solo field, and each block has exactly one winning
  entity chosen by hash-weighted deterministic lottery (entropy preserved via the
  seeded per-height RNG, so the chain stays uniform across all players).
- Explorer, dashboard, stats, and HUD reworked to show global hash-share, pool
  membership, fees, and pending pool payouts.
- Settings page now reflects the current mining target (mode selection moved to
  the rig's pool dropdown).
- Save key bumped to `v0_3` (fresh state; earlier saves not migrated).

### Deferred / TODO
- Shop / GPU purchasing / rig upgrades (this build's slowed economy is designed
  to make that spend/store loop meaningful).
- Per-GPU sound, weather-by-zip API, GPU data table, multiple rigs, player
  movement, real leaderboards, save slots, server-synced chain, delegation/slashing.

## [0.2.1] — 2026-06-22

Fixes block cadence and makes the chain uniform across all players.

### Fixed
- **Blocks were appearing every ~1–2s instead of every 10s.** Cause: the chain
  was advanced by a full block per UI tick (the render loop drove cadence). The
  chain is now a deterministic function of **wall-clock time** — it advances by
  exactly one block per 10 real seconds regardless of how often the UI renders.

### Changed
- **Chain state separated from the player simulation** (`engine/chain.js`):
  - Height = `floor((now − GENESIS) / blockTime)` from a fixed shared genesis
    (2026-01-01T00:00:00Z), so every player computes the **same height and the
    same block winners** for the same instant — uniform across all clients.
  - Per-block winner is chosen by a **deterministic seeded RNG** (mulberry32)
    keyed on block height, making the timeline reproducible.
  - The player's rigs drive only their **hashrate input** (win probability),
    not the block cadence.
- `advance(dtSec)` replaced by `syncToTime(nowMs)`; the render loop now only
  reads and repaints (ticks at 1s purely for UI freshness).
- Power-bill and BBT-price accrual are now based on **real elapsed time**, not a
  per-tick constant, so they're independent of render rate too.

### Notes
- This lays the foundation for a real shared/server-synced chain later: clients
  already agree on height and winners from the shared genesis; a server would
  only need to authoritatively set hashrate inputs.

## [0.2] — 2026-06-22

Adds the power/heat/cost economy and refactors the blockchain reward model into
a real hash-weighted block lottery.

### Added
- **Block reward lottery** (`engine/chain.js`): 10-second blocks, each with a real
  winner. Win probability = your hashrate / network hashrate. High-entropy RNG
  (`crypto.getRandomValues`) so streaks and droughts are genuine luck.
- **Solo vs. Pool mode** (Settings): Solo = winner-take-all per block (swingy);
  Pool = steady payout proportional to your share. Same mean, different variance.
- **BTC-style halving**: block reward starts at 50 BBT, halves every 50,000 blocks.
- **Luck stat**: actual blocks won ÷ statistically expected — short-run variance
  is visible; converges to ~100% over large samples.
- **Power model** (`engine/power.js`): per-rig Low/Normal/High setting →
  125/200/300 W per GPU + 80 W parasitic. Setting also scales hashrate
  (0.75× / 1.0× / 1.18×), creating a real efficiency tradeoff (more power = more
  hash but worse H/W).
- **Heat/BTU**: total watts → BTU/hr (×3.412) and a modeled room temperature
  rising from a fixed 72°F / 25% RH baseline.
- **Electricity cost**: kWh tracked from draw; settable $/kWh (default $0.08) in
  Settings; 30-day power bill accrues.
- **BBT→USD price** with gentle simulated drift (market feel).
- **Stats page** (legacy-calculator style): BBT price, luck %, network share,
  efficiency, day/week/month revenue vs. power cost vs. net profit, heat & room
  temp, and the accruing 30-day bill.
- **Settings page**: mining mode toggle, $/kWh slider, reset-progress.

### Changed
- **Rewards are no longer proportional drip.** Solo mode is winner-take-all per
  block; the explorer now shows the block *winner* (🏆 when it's you) instead of a
  proposer.
- Block time **6 s → 10 s**.
- Rig hashrate is now **power-driven** (set by the Low/Normal/High control).
- Save key bumped to `v0_2` (fresh state; v0.1 saves are not migrated).

### Deferred / TODO
- Weather-by-zip API for real ambient temperature (replaces fixed 72°F/25% RH).
- Large GPU data table (per-card power/hash) — to be supplied; will replace the
  single RX 6800 entry and the simple hashMult scaling.
- Per-GPU sound design (blower vs. open-fan; rig spin-up) — provided per-asset later.
- GPU upgrade & purchasing, multiple rigs, player movement, real leaderboards,
  save slots, real Tendermint/Cosmos deployment, delegation/slashing.

## [0.1] — 2026-06-22

First versioned build. Establishes the core loop, the network model, and the
project structure for version control.

### Added
- **Title screen** (`index.html`) with interactive START / LOAD / LEADERBOARDS
  buttons (image-swap pressed states). START and LOAD open the game; LEADERBOARDS
  routes to the block explorer for now.
- **Dorm room** (`game.html`) using the player's own pixel art, with a tappable
  mining-rig hotspot.
- **Rig stats sheet**: per-card breakdown, live hashrate, voting power, BBT balance,
  plus navigation to Console / My Node / Explorer and a Start/Stop power control.
- **Mining console** — a procedural, CRT-styled scrolling miner log (boot + DAG
  build, per-card Mh/s, temp/fan telemetry, new-job lines, share-found highlights).
- **Rig state machine**: `OFFLINE → STARTUP → MINING → STOPPING → OFFLINE`.
  - OFFLINE shows a blank "screen off" console.
  - STARTUP plays the boot/DAG sequence (only on a fresh power-on, not every open).
  - MINING scrolls indefinitely via a 200-line ring buffer (loops seamlessly,
    never restarts).
  - STOPPING plays a shutdown sequence, then returns to OFFLINE.
- **Per-rig independence**: each rig is its own object with its own state and
  hashrate. Only rigs in MINING contribute. Total live hashrate is the sum across
  rigs and is the single synced source for the HUD, dashboard, and console.
- **Validator dashboard** ("My Node"): voting power & network share, your hashrate
  vs. equilibrium, balance, rewards/min, a per-rig list, and a share sparkline.
- **Block explorer**: validator set ranked by voting power (player highlighted),
  live block feed, per-block reward distribution.
- **Mock testnet engine** (`engine/chain.js`): GPU work → decaying stake-weight →
  PoS reward split with commission, behind a `ChainSource` interface for a future
  real Tendermint/Cosmos RPC. Offline catch-up capped at 24h.
- **Architecture spec** (`docs/ARCHITECTURE.md`).

### Changed
- **Token renamed from `$HASH` to `BBT`** across the entire app.
- Console no longer replays the DAG build every time it's opened — boot only runs
  on a genuine rig power-on.
- Console scroll converted to a ring buffer so it loops past 200 lines without a
  visible restart.
- Dashboard and console now read the same total-hashrate source, keeping displayed
  figures synchronized.

### Deferred / TODO
- Per-GPU sound design (blower vs. open-fan cards sound different; rig spin-up sound).
  To be provided per-asset later.
- GPU upgrade & purchasing mechanics.
- Multiple rigs in the room (engine already supports N rigs).
- Player movement / explorable room.
- Real leaderboards (currently routes to the explorer).
- Save slots (START vs LOAD as distinct behaviors).
- Real Tendermint/Cosmos testnet deployment (interface ready).
- Delegation, slashing, dynamic NPC validator behavior.
