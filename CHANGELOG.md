# Changelog

All notable changes to Rig Runner / *Miner's Life* are tracked here.
Format loosely follows Keep a Changelog. Dates are YYYY-MM-DD.

## [0.9.1] — 2026-06-24

Minor release: fixes and currency polish.

### Fixed
- **Power plug-assign dropdown no longer snaps back** — the 1-second tick was
  rebuilding the Power page mid-selection; it now skips the rebuild while you're
  interacting with a plug dropdown, power switch, or reset button.

### Changed
- **BBT now shows 3 decimal places** everywhere (fractional tokens matter), and
  **USD shows 2 decimals** (cents). Applied to the HUD and exchange.
- **Store is now priced in USD** — item table, cart, sales tax, totals, and
  locations all show and charge USD from your wallet (the exchange still trades
  USD\u2194BBT). Earn salary in USD, buy parts directly; convert to BBT only when you
  want to hold the token.

## [0.9] — 2026-06-24

A full power/electrical overhaul: POWER is now its own page with a per-location
one-line diagram, live kilowatt meters, PDUs, and a realistic 3-stage breaker model.

### Added
- **POWER bottom-nav tab** (moved out of Stats) — a location-aware page driven by a
  single source of truth (`electrical.js` `POWER_TOPOLOGY`) shared by the room,
  the rigs, and this page.
- **Per-location topology**:
  - **Dorm** — 2× kilowatt meters (C13) on one 20A/120V circuit.
  - **Garage** — 2× 30A/240V circuits, each feeding a PDU with 6× C19 plugs.
  - **Mining Shed** — 200A service, 8× 30A/240V → 8 PDUs (4 left + 4 right), each
    6× C19 (48 plug slots). Left/right side toggle on the page.
- **3-stage series fault model** — protection trips in realistic order: **PDU
  breaker → meter breaker → panel fuse**. A tripped stage cuts everything
  downstream; each **stays tripped until you manually reset it** at that stage.
- **One-line diagram** — chevron-style power route; lines light **green** when
  powered and **red** at/after a fault. Tap any node (panel / meter / PDU) to open
  the matching art.
- **Live kilowatt meters** — each meter shows its rig's real-time draw as a bright
  **yellow numeric readout on the LCD**, rounded up to whole watts, aligned to the
  correct meter screen.
- **PDU controls** — power switch (on/off powers the rig) and a resettable breaker.
- **Manual plug assignment** — plug each rig into a specific meter/PDU slot. A rig
  only mines when it's plugged in, switched on, and not downstream of a trip.
  (Existing rigs are auto-assigned to free plugs so nothing stops unexpectedly.)
- **Parasitic loss** (~0.1%) shown on the page (delivered vs. drawn watts).

### Changed
- Hashrate is now power-gated: unplugged / switched-off / tripped rigs produce no
  hashrate until power is restored.

### Pending
- Rig click-areas still to be aligned to the silver miner-shell outline (screenshot).

## [0.8] — 2026-06-23

Adds the electrical/power system, console share statuses, exchange depth, and
GPU-typed miner software.

### Added
- **Electrical / power system** (`electrical.js`) with a realistic soft cap:
  - **Dorm** = single 20A/120V circuit. **Garage** = two 30A/240V circuits.
    **Shack** = 200A service split into 6×30A breaker panels, each a 6-plug PDU
    (36 plugs → up to ~18 rigs).
  - NEC 80% continuous-load rule: drawing past a circuit's safe watts **warns**,
    and exceeding the breaker rating **trips it** and throttles those rigs (no
    hashrate until load drops).
  - New **Power & electrical** section in Stats with per-room subtabs (the "meter
    at the wall"): per-circuit amps draw, watts, plug usage, and trip status.
- **Console stale & rejected shares** — ~0.1% stale (rare) and a per-rig
  **0.5–1.3%** reject rate, shown live with accepted/rejected/stale tallies.
- **Exchange depth** — candle interval toggles (**1m / 5m / 1h / 1d / 1w**), a
  **right-side price axis** with gridlines and a highlighted current price, and a
  **live order book** that churns with activity and volume.
- **GPU-typed miner software** — rigs now boot the appropriate miner by GPU
  vendor (NVIDIA → T-Rex/CUDA, AMD → TeamRedMiner/OpenCL) with matching console
  output. Foundation for fuller per-GPU console themes.

### Pending
- Rig click-areas to be re-aligned to the silver miner-shell outline (awaiting a
  reference screenshot).

## [0.7] — 2026-06-23

Adds a user account layer, a far more sophisticated exchange, named/swappable
rigs, live pool dashboards with virtual miners, and a reworked store layout.

### Added
- **User account** — New/Load Game now starts with a username entry that issues a
  unique, copyable **User ID** (`RR-XXXX-XXXX`). One global user owns all 6 slots,
  and every slot is stamped with the user ID. (Role-based access / app-store
  account linkage is backlog; this is the identity stub for it.)
- **Exchange v2**:
  - **1-minute candlestick chart** with red/green bodies and simulated volume.
  - **Volatility engine** — price holds a calm ~5–11% band normally with ~2% drift
    per 15 min, punctuated by **rare 3–5 minute events** that swing **15–20%** up
    or down (≈ one event every ~3.5 hours). Synthesized from the one shared price
    sim, so all slots see the same market.
  - **Limit buy / limit sell** at a user-entered price — orders rest and fill when
    the market reaches your level (maker fee), alongside instant market orders
    (taker fee).
  - **Buy/Sell** are now smaller, distinct **green/red** toggle buttons, separate
    from the execute button.
- **Named, swappable rigs** — every rig has an editable **Rig Name**, used as your
  rig ID in pool dashboards.
- **Pool dashboards** — tap any pool in the Explorer to see a live dashboard of the
  **virtual NPC miners** that make up its hashrate (deterministic `userID.rigname`
  rosters that sum to the pool's GH/s). Your own rigs register here under your
  username when assigned, with per-rig and cumulative hashrate. Drill into any
  miner to see their rigs.
- **Store rework** — left-side vertical category selector with items in a table on
  the right; **Cart** and **Assemble** are top-level selectors so nothing requires
  scrolling. (Also fully resolves the old category-scroll snap-back.)

### Notes
- Salaries (`occupations.csv`), part prices (`parts_pricing.csv`) remain
  CSV-editable. Fee tiers and volatility constants live in `market.js`.
- Deferred: real money for speedups / premium occupations (app-store linked);
  laptops/exchange access in garage & shack; CSV loaded at runtime.

## [0.6] — 2026-06-23

Adds a real-world income layer: occupations, a USD wallet with weekly salary, and
a dorm-laptop crypto exchange to convert USD into BBT.

### Added
- **Occupations** (50 real BLS-based roles, $30k–$239k/yr). Pick one right after
  creating a slot. Weekly salary = annual ÷ 52. Editable via `occupations.csv`.
- **USD wallet** ($, stable at $1) alongside BBT (floating). HUD shows both, with
  the live BBT price.
- **Weekly salary** — game week = real week. Week 1 deposits a full weekly salary
  (your seed cash); each subsequent real week adds 15% of the weekly salary.
- **Dorm laptop → Exchange**: tap the laptop on the desk to open a mock USD/BBT
  market that reflects the live sim price (no market impact). Includes a price
  chart, an order book (depth scaled to mined token supply), buy/sell, and a
  **tiered maker/taker fee** schedule (0.40%/0.60% down to 0.00%/0.10%) that drops
  as your trading volume grows. Market (taker) vs limit (maker) toggle.

### Fixed
- **Store category tabs no longer snap back** when scrolling — added drag-to-
  scroll, wheel-to-scroll, and scroll-position persistence across re-renders.

### Notes
- New flow: start with your first paycheck in USD → convert to BBT on the laptop
  exchange → buy parts/locations in the store. The one free dorm rig mines from
  the start.
- Deferred: laptops/computers in the garage and shack (exchange access there);
  loading salaries/fees from CSV at runtime; limit orders that actually rest on
  the book.

## [0.5] — 2026-06-22

Adds a full multi-category parts store, a shopping cart, a parts inventory, and
custom rig assembly from individual components.

### Added
- **Parts store** with 10 categories: GPUs (all 49 from the reference sheet),
  Cases/Frames, Motherboards, CPU, Memory, SSD, USB Sticks, GPU Risers, Case
  Fans, Power Supplies — plus the existing Locations.
- **Shopping cart**: add parts, see subtotal → **5% sales tax** → total in BBT,
  charged against the slot balance at checkout. Purchased parts land in a
  per-slot **Parts Owned** inventory as individual swappable objects.
- **49 real GPUs** with hashrate + power **ranges** mapped to the rig power
  setting: low = min hash/min watts (efficient), normal = midpoint, high =
  max/max. Hashrates assumed identical for the BBT network.
- **Custom rig assembly**: build a rig from owned parts. A valid rig requires a
  **case + matching motherboard** (both come in 6/8/12/19 sizes and must match),
  CPU, memory, SSD-or-USB boot drive, GPU risers, a PSU, and **≥2 GPUs**. The
  case/board size caps GPU count (2 up to the slot max). Mixed-GPU rigs supported.
- Built rigs can be **placed in any owned location** and mine alongside the rest.

### Notes
- Part prices are **starter values** — override them all via the included
  `parts_pricing.csv` (every item, with hashrate/power specs for reference).
- A full 6× RX 6800 rig costs ~993 BBT (946 subtotal + 47.3 tax) — a meaningful
  investment against the slowed mining economy.
- Deferred: dual-PSU requirement above 8 GPUs; per-part swap UI on existing rigs;
  fans as a cooling/heat perk; loading prices from CSV at runtime.

## [0.4] — 2026-06-22

Adds save slots, multiple locations, and a location shop.

### Added
- **6 save slots** ("miners") on a landing page after START. Each slot is an
  independent human — its own BBT balance, owned locations, rigs, and pool choice
  — but **all slots share one world** (the same deterministic chain, pools, block
  timeline, and BBT price).
- **Locations as buyable sites**, each holding independent rigs (one per rig frame
  in the art):
  - **Dorm Room** — free, auto-owned (1 rig)
  - **Home Garage** — 100 BBT (4 rigs)
  - **Mining Shack** — 200 BBT (10 rigs)
- **Location Shop** tab: spend the slot's BBT to buy locations. Buying adds that
  location's rigs (same base config as the dorm: 6× RX 6800, normal power).
- **Room view is location-aware**: switch between owned locations with tabs; every
  rig frame is an independent tappable hotspot.
- All owned locations **mine simultaneously** — every active rig sums into the
  slot's total hashrate. Point them at one pool for a pooled view of all your rigs.

### Changed
- **Storage split**: a shared `world` record (chain + price) plus per-slot records
  (balance, locations, rigs, pool, power). Each slot feeds its own hashrate into
  the shared chain while active.
- Bottom nav adds **SHOP**; "MY NODE" shortened to "NODE".

### Notes
- A full farm (dorm + garage + shack = 15 rigs) is ~0.66% of the global network,
  up from the dorm's 0.044% — a real incentive to expand.
- Future: link multiple slots to one wallet; more shop locations; per-location
  rig config tuning.

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
