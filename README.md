# Rig Runner — *Miner's Life*  ·  v0.3

A browser-based crypto-mining idle/sim game grounded in real early-Ethereum
economics. Run GPU rigs, choose to **solo mine** or **join a pool**, earn **BBT**,
and weigh hashrate against your power bill. Runs entirely in the browser — no
build step. Open `index.html`.

## Play

Open `index.html`, or serve the folder (recommended):
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```
Click **START GAME** → tap the rig → pick a mining target (Solo or a pool).

```
index.html   → title screen
game.html    → room + console + dashboard + explorer + stats + settings
```

## Network model (v0.3)

Anchored to **late-2015 Ethereum**: ETH ~$3.15, 5 ETH/block, 10s blocks, a 6-card
~168 MH/s rig earning ~$1,800/mo. That makes the player **~0.044% of a ~381 GH/s
global network** — a minnow among giants.

- **8 pools** (Dwarfpool, Ethermine, F2Pool, Nanopool, ethpool, MiningPoolHub,
  Coinotron, Suprnova) hold ~85% of global hashrate; the solo field (incl. you)
  is the remaining ~15%.
- **Solo** = winner-take-all per block, brutal variance, no fees.
- **Pool** = steady share of the pool's wins, paid ~every 15 min, minus the
  pool's fee. **Smaller pools charge lower fees** → genuinely higher net yield,
  but win less often → lumpier. Pre-fee EV is identical everywhere.
- Each block has exactly one winner, chosen by a deterministic hash-weighted
  lottery — uniform across all players, with real entropy in the streaks.

## What's here

| Path | What it is |
|---|---|
| `engine/chain.js` | Deterministic time-driven chain + 8-pool lottery economy |
| `engine/power.js` | Power draw, heat (BTU), kWh cost, BBT↔USD price |
| `game.html` | Room, console, dashboard, explorer, stats, settings |
| `index.html` | Title screen |
| `assets/`, `docs/`, `CHANGELOG.md` | Art, design spec, version history |

## Roadmap / TODO

- **Shop / GPU purchasing / rig upgrades** (the slowed economy makes this matter)
- Per-GPU sound, weather-by-zip API, GPU data table, multiple rigs, player
  movement, real leaderboards, save slots, server-synced chain

## Assets & credits

Pixel art is the author's own work. BBT and the in-game network are fictional;
this is a game, not financial software.
