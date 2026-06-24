# Rig Runner - Miner's Life · v0.9.1

Browser-based crypto-mining sim. Create an account, pick a miner + occupation,
earn weekly USD, buy parts in USD, build & name rigs, wire up your power, trade
USD<->BBT on the dorm laptop exchange, assign rigs to pools, and mine. Open
index.html (or serve: python3 -m http.server 8000).

## v0.9.1 (minor)
- Fixed: Power plug-assign dropdown no longer snaps back mid-selection.
- BBT shows 3 decimals; USD shows 2. Store is now priced and paid in USD
  (exchange still trades USD<->BBT).

## Power (v0.9)
- POWER tab: per-location one-line diagram (green=on, red=tripped), tap into the
  fuse box / kilowatt meter / PDU art. Live yellow watts on each meter LCD.
- Topology (engine/electrical.js): Dorm 2x C13 on 20A/120V; Garage 2x 30A/240V ->
  2 PDUs (6x C19 ea); Shed 200A, 8x 30A/240V -> 8 PDUs (4 left + 4 right), 48 plugs.
- 3-stage series breakers (PDU -> meter -> panel), manual reset. Manual plug
  assignment; a rig only mines when plugged in, on, and not downstream of a trip.

## Core loop
Occupation pays weekly USD. Buy parts (49 GPUs + components) in USD, assemble rigs
(case + matching mobo 6/8/12/19 + CPU + memory + boot drive + risers + PSU + >=2
GPUs), place + plug them in within circuit limits. Trade USD<->BBT on the exchange
(1m/5m/1h/1d/1w candles, limit + market orders, tiered fees). Solo or pool mining;
~381 GH/s network, 8 pools, 10s blocks, ~4yr halving, 5 BBT reward. CSV-editable
salaries/prices in docs/. A game, not financial software.
