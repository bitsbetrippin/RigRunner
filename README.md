# Rig Runner — *Miner's Life*  ·  v0.2.1

A browser-based crypto-mining idle/sim game. Build and run GPU mining rigs, win
blocks, earn **BBT**, and weigh your hashrate against your power bill. Runs
entirely in the browser — no build step, no install. Open `index.html`.

## Play

Open `index.html` in any modern browser, or serve the folder (recommended — see
below). Click **START GAME** (or LOAD) to enter your dorm, tap the rig, and go.

```
index.html        → title screen (START / LOAD / LEADERBOARDS)
game.html         → dorm room + console + dashboard + explorer + stats + settings
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
| `game.html` | Room, console, dashboard, explorer, stats, settings |
| `engine/chain.js` | Deterministic, time-driven block-lottery engine |
| `engine/power.js` | Power draw, heat (BTU), kWh cost, BBT↔USD price |
| `assets/` | Pixel-art room + title-screen images |
| `docs/ARCHITECTURE.md` | Network model & design spec |
| `CHANGELOG.md` | Version history |

## Core concepts

- **Token: BBT.** Balances, rewards, and the power bill are denominated in BBT
  (converted to USD via a drifting in-game price for the cost math).
- **Deterministic chain (uniform for all players).** Block height is a pure
  function of wall-clock time from a fixed shared genesis: one block every 10
  seconds, and every player computes the same height and the same winners for the
  same instant. The render loop does not drive cadence.
- **Block lottery.** Your win probability = your hashrate ÷ network hashrate.
  **Solo** = winner-take-all (swingy); **Pool** = steady payout by share. Reward
  halves BTC-style over time. **Luck %** = actual vs. statistically expected wins.
- **Rigs are independent machines** with a state machine
  (`OFFLINE → STARTUP → MINING → STOPPING`) and a **power setting**
  (Low/Normal/High) that sets watts *and* hashrate — more power buys more hash at
  worse efficiency (H/W). Rigs are the player's input into the shared timeline.
- **Power, heat, cost.** Draw → BTU/hr heat → modeled room temp (from a fixed
  72°F / 25% RH baseline), and → kWh × your $/kWh rate → a 30-day power bill.
- **Stats page** = a legacy mining calculator: day/week/month revenue vs. power
  cost vs. net profit, efficiency, network share, luck, heat, and the bill.

## Roadmap / TODO

- **Server-synced chain** (the deterministic foundation is in place)
- **Weather-by-zip API** for real ambient temperature
- **GPU data table** (per-card power/hash) — to be supplied
- Per-GPU **sound**, GPU **upgrade/purchasing**, **multiple rigs**, **player movement**
- **Real leaderboards**, **save slots**, delegation/slashing

## Assets & credits

Pixel art is the author's own work. BBT and the in-game network are fictional;
this is a game, not financial software.
