# Rig Runner - Miner's Life · v0.5

Browser-based crypto-mining sim. Pick one of 6 miners (save slots) in a shared
world, run GPU farms across locations, buy parts and BUILD custom rigs, solo-mine
or join a pool, earn BBT. Open index.html (or serve: python3 -m http.server 8000).

## Store & rig building (v0.5)
- 10 store categories: GPUs (49 real cards), Cases/Frames, Motherboards, CPU,
  Memory, SSD, USB, GPU Risers, Case Fans, Power Supplies + Locations.
- Shopping cart: subtotal -> 5% sales tax -> total in BBT, charged at checkout.
  Bought parts go to a per-slot Parts Owned inventory.
- Assemble custom rigs: case + matching motherboard (6/8/12/19, must match) + CPU
  + memory + boot drive + risers + PSU + >=2 GPUs. Case/board size caps GPU count.
- GPU hashrate/power RANGES map to Low/Normal/High (low=efficient, high=max).
- Edit docs/parts_pricing.csv to set all part prices (starter prices included).

## Slots, locations, world
- 6 independent miners share ONE deterministic world (chain, pools, timeline, price).
- Locations: Dorm (free, 1 rig), Garage (100 BBT, 4 rigs), Shack (200 BBT, 10 rigs).
  All owned locations + built rigs mine simultaneously into your hashrate.

## Network
~381 GH/s global, player starts ~0.044%. 8 pools (~85%), solo field ~15%. Solo =
winner-take-all; pools = steady share, ~15min payout, minus fee. 10s blocks,
~4-year halving, 5 BBT reward. Token: BBT. This is a game, not financial software.
