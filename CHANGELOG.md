# Changelog

All notable changes to Rig Runner / *Miner's Life* are tracked here.
Format loosely follows Keep a Changelog. Dates are YYYY-MM-DD.

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
