# Rig Runner - Miner's Life · v0.9

Browser-based crypto-mining sim. Create an account, pick a miner + occupation,
earn weekly USD, trade USD<->BBT on the dorm laptop exchange, buy parts, build &
name rigs, wire up your power, assign rigs to pools, and mine. Open index.html
(or serve: python3 -m http.server 8000).

## New in v0.9 - Power overhaul
- POWER is its own tab: a per-location one-line diagram (chevron route, green=on,
  red=tripped) you can tap into the fuse box, kilowatt meter, and PDU art.
- Topology (single source of truth in engine/electrical.js):
  - Dorm: 2x kilowatt meters (C13) on one 20A/120V circuit.
  - Garage: 2x 30A/240V -> 2 PDUs, 6x C19 each.
  - Shed: 200A service, 8x 30A/240V -> 8 PDUs (4 left + 4 right), 6x C19 each (48 plugs).
- 3-stage series breakers trip in order PDU -> meter -> panel; stay tripped until
  you manually reset that stage. Live kilowatt meters show real-time watts in
  bright yellow on the LCD (rounded up). PDU power switch + breaker per rig.
- Manual plug assignment: a rig only mines when plugged in, switched on, and not
  downstream of a trip. Parasitic loss ~0.1% shown.

## Core loop
Occupation pays weekly USD. Convert USD->BBT on the laptop exchange. Buy parts
(49 GPUs + components), assemble rigs (case + matching mobo 6/8/12/19 + CPU +
memory + boot drive + risers + PSU + >=2 GPUs), place + plug them in within
circuit limits. Solo or pool mining; ~381 GH/s network, 8 pools, 10s blocks,
~4yr halving, 5 BBT reward. CSV-editable salaries/prices in docs/.
A game, not financial software.
