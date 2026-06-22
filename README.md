# Rig Runner — *Miner's Life*  ·  v0.1

A browser-based crypto-mining idle/sim game. Build and run GPU mining rigs, earn
**BBT**, and climb a validator network. Runs entirely in the browser — no build
step, no install. Open `index.html`.

## Play

Open `index.html` in any modern browser, or serve the folder (recommended — see
below). Click **START GAME** (or LOAD) to enter your dorm, tap the rig, and go.

```
index.html        → title screen (START / LOAD / LEADERBOARDS)
game.html         → dorm room + mining console + node dashboard + block explorer
```

> Some browsers restrict `localStorage` and asset loading over `file://`. If
> saves don't persist or images don't load, serve the folder locally:
>
> ```bash
> python3 -m http.server 8000   # then visit http://localhost:8000
> ```

## What's here

| Path | What it is |
|---|---|
| `index.html` | Interactive title screen; routes to the game |
| `game.html` | Room, mining console, validator dashboard, block explorer |
| `engine/chain.js` | Mock testnet engine — decaying work-weight → PoS rewards |
| `assets/` | Pixel-art room + title-screen images |
| `docs/ARCHITECTURE.md` | Network model & design spec |
| `CHANGELOG.md` | Version history (starts at 0.1) |

## Core concepts

- **Token: BBT.** All balances and rewards are denominated in BBT.
- **Rigs are independent machines.** Each rig has its own state machine
  (`OFFLINE → STARTUP → MINING → STOPPING`) and hashrate. Only rigs that are
  MINING contribute. Total live hashrate is the sum across all rigs.
- **Mining console.** A procedural, CRT-styled scrolling miner log. Boots and
  builds the DAG on a fresh power-on, then scrolls forever (200-line ring buffer,
  loops seamlessly). OFFLINE shows a dark screen; STOPPING shows a shutdown.
- **Network model.** GPU work → decaying **stake-weight** → block rewards split by
  **stake-share** (with validator commission), settled to a mock database behind a
  `ChainSource` interface a real Tendermint/Cosmos RPC can replace later. Full
  detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Roadmap / TODO

- Per-GPU **sound** (blower vs. open-fan cards; rig spin-up) — provided per-asset later
- GPU **upgrade & purchasing** mechanics
- **Multiple rigs** in the room (engine already supports N)
- **Player movement** / explorable room
- **Real leaderboards** (currently routes to the explorer)
- **Save slots** (START vs LOAD as distinct behaviors)
- Real **Tendermint/Cosmos testnet** deployment (interface ready)
- **Delegation, slashing,** dynamic NPC validators

## Assets & credits

Pixel art is the author's own work. BBT and the in-game network are fictional;
this is a game, not financial software.
