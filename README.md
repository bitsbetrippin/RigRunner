# Rig Runner - Miner's Life · v0.8

Browser-based crypto-mining sim. Create an account, pick a miner + occupation,
earn weekly USD, trade USD<->BBT on the dorm laptop exchange, buy parts, build &
name rigs, watch your circuits, assign rigs to pools, and mine. Open index.html
(or serve: python3 -m http.server 8000).

## New in v0.8
- Electrical system: Dorm = one 20A/120V circuit, Garage = two 30A/240V, Shack =
  200A service with 6x30A panels + 6-plug PDUs (36 plugs, ~18 rigs). Soft cap:
  over-safe warns, over-breaker trips and throttles. Stats > Power, per-room subtabs.
- Console: stale (~0.1%) + rejected (0.5-1.3%) share statuses.
- Exchange: 1m/5m/1h/1d/1w candle toggles, right-side price axis, live order book.
- GPU-typed miner software (NVIDIA T-Rex / AMD TeamRedMiner) themes the console.

## Core loop
Occupation pays weekly USD (week 1 full, then 15%/wk). Convert USD->BBT on the
laptop exchange. Buy parts (49 GPUs + components), assemble rigs (case + matching
mobo 6/8/12/19 + CPU + memory + boot drive + risers + PSU + >=2 GPUs), place in
owned locations within their circuit limits. Solo or pool mining; ~381 GH/s
network, 8 pools, 10s blocks, ~4yr halving, 5 BBT reward.

## Data (CSV-editable)
docs/occupations.csv, docs/parts_pricing.csv. Fee tiers/volatility in
engine/market.js; circuit layouts in engine/electrical.js. A game, not financial software.
