# Rig Runner — Miner's Life · v0.4

Browser-based crypto-mining sim grounded in late-2015 Ethereum economics. Pick one
of 6 independent miners (save slots) in a shared world, run GPU farms across
multiple locations, solo-mine or join a pool, earn BBT, and grow each wallet.
Open index.html (or serve: python3 -m http.server 8000).

## Slots, locations, world
- 6 save slots — each an independent "human" with its own BBT, locations, and rigs.
- All slots share ONE world: same deterministic chain, pools, block timeline, BBT price.
- Buy locations from the Shop: Dorm (free, 1 rig), Garage (100 BBT, 4 rigs),
  Mining Shack (200 BBT, 10 rigs). Each rig frame is an independent rig; all owned
  locations mine simultaneously into your total hashrate.

## Network
~381 GH/s global, player starts ~0.044% (a full 15-rig farm ~0.66%). 8 pools hold
~85%; solo field ~15%. Solo = winner-take-all (swingy); pools = steady share, paid
~15 min, minus fee (smaller pools = lower fee = higher net). 10s blocks, ~4-year
halving, full 5 BBT reward. Token: BBT.

## Files
engine/chain.js (chain + pool lottery), engine/power.js (power/heat/cost),
engine/locations.js (location catalog + rig hotspots), game.html, index.html (title).

Roadmap: link slots to one wallet, more shop locations, per-location rig tuning,
per-GPU sound, weather API, GPU data table, player movement, real leaderboards.

Pixel art is the author's own work. This is a game, not financial software.
