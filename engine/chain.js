/**
 * chain.js — deterministic mock testnet engine (v0.3)
 *
 * Time-driven chain (unchanged): height = floor((now - GENESIS)/blockTimeSec),
 * uniform across all players, reproducible via seeded per-block RNG.
 *
 * v0.3 — REAL-WORLD NETWORK SCALE + POOLS:
 *   Anchored to late-2015 Ethereum: ETH ~$3.15, 5 ETH/block, 10s blocks, a
 *   6-card ~168 MH/s rig earning ~$1,800/mo => the player is ~0.044% of a
 *   ~381 GH/s global network. Solo mining is a genuine long-shot.
 *
 *   The network is modeled as 8 mining POOLS (~85% of global hashrate, taper
 *   from ~20.5% down to ~6% of global) plus a SOLO FIELD (~15%) of independent
 *   miners that includes the player. Each block has exactly one winning entity
 *   (a pool or a solo miner), chosen by hash-weighted deterministic lottery.
 *
 *   Player can mine SOLO (winner-take-all, brutal variance) or join a POOL
 *   (steady share of that pool's wins, paid every ~15 min, minus the pool fee).
 *   Smaller pools charge lower fees => slightly higher net yield, but win less
 *   often => lumpier payouts. Expected value before fees is identical everywhere.
 *
 * Units: hashrate is in MH/s throughout. Reward is in BBT (mapped from the ETH
 * anchor: 5 ETH/block -> baseBlockReward BBT/block; tune freely).
 */

/* Fixed recent genesis (shared by all players) keeps block height small so the
   height-based halving doesn't zero out the reward. Must be a FIXED timestamp,
   not "now at launch", or players' chains would diverge. */
const GENESIS_MS = Date.UTC(2026, 5, 1, 0, 0, 0); // 2026-06-01T00:00:00Z

/* ---- real-world-anchored constants ---- */
const GLOBAL_HASH_MH = 381000;     // ~381 GH/s, early-Frontier Ethereum scale
const POOL_FIELD_FRACTION = 0.85;  // pools hold 85% of global; 15% is solo field
const POOL_PAYOUT_SEC = 900;       // ~15-minute pool payout windows

const DEFAULTS = {
  chainId: 'rigrunner-testnet-1',
  blockTimeSec: 10,
  baseBlockReward: 5,              // BBT per block (mirrors 5 ETH/block anchor)
  // ~4-year halving like Bitcoin: at 10s blocks, 4yr ~= 12.6M blocks. Keeps the
  // reward at a full 5 BBT for years instead of decaying within weeks.
  halvingIntervalBlocks: 12614400,
  rewardMode: 'solo',             // 'solo' | 'pool'
  poolId: null,                   // which pool the player joined (when mode='pool')
};

/* Pool definitions: descending taper, realistic names + stratum ports + fees.
   `weight` is the relative taper (normalized to POOL_FIELD_FRACTION of global). */
const POOL_DEFS = [
  { id:'dwarfpool',     name:'Dwarfpool',     host:'eu1.dwarfpool.example',     port:8008,  fee:0.020, weight:27   },
  { id:'ethermine',     name:'Ethermine',     host:'eu1.ethermine.example',     port:4444,  fee:0.010, weight:21   },
  { id:'f2pool',        name:'F2Pool',        host:'eth.f2pool.example',        port:6688,  fee:0.025, weight:16   },
  { id:'nanopool',      name:'Nanopool',      host:'eth-eu1.nanopool.example',  port:9999,  fee:0.010, weight:12.5 },
  { id:'ethpool',       name:'ethpool',       host:'eu.ethpool.example',        port:3333,  fee:0.015, weight:10   },
  { id:'miningpoolhub', name:'MiningPoolHub', host:'eth.miningpoolhub.example', port:20535, fee:0.009, weight:9    },
  { id:'coinotron',     name:'Coinotron',     host:'coinotron.example',         port:3344,  fee:0.008, weight:8.5  },
  { id:'suprnova',      name:'Suprnova',      host:'eth.suprnova.example',      port:5000,  fee:0.005, weight:8    },
];

function buildPools() {
  const wSum = POOL_DEFS.reduce((s,p)=>s+p.weight,0);
  return POOL_DEFS.map(p => {
    const globalShare = p.weight / wSum * POOL_FIELD_FRACTION;
    return { ...p, globalShare, hashRate: Math.round(globalShare * GLOBAL_HASH_MH) };
  });
}

/* ---- deterministic RNG ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function blockRng(height, salt = 0) {
  return mulberry32(((height + 1) * 2654435761 ^ (salt * 40503)) >>> 0);
}

/**
 * Build genesis network state.
 * playerHashRate is in MH/s (a 6-card rig ~168).
 */
function createNetwork(playerHashRate = 168) {
  const pools = buildPools();
  const poolHashTotal = pools.reduce((s,p)=>s+p.hashRate,0);
  const soloFieldHash = GLOBAL_HASH_MH - poolHashTotal; // ~15% incl. NPC solos + player

  return {
    network: {
      ...DEFAULTS, genesisMs: GENESIS_MS, height: 0,
      globalHashRate: GLOBAL_HASH_MH,
      soloFieldHash,                 // independent miners (incl. player)
      lastBlockAt: GENESIS_MS,
    },
    pools,
    player: {
      id:'player', moniker:'Dorm Rig', isPlayer:true,
      hashRate: playerHashRate,      // MH/s, set live from rigs
      balance: 0, blocksWon: 0,
      pendingPool: 0,                // unpaid pool earnings accruing toward payout
      lastPayoutHeight: 0,
    },
    blocks: [],
    account: { balance: 0 },
    stats: { playerBlocksWon: 0, playerExpectedBlocks: 0, blocksSeen: 0,
             poolPayouts: 0, feesPaid: 0 },
  };
}

function currentBlockReward(net) {
  return net.baseBlockReward / Math.pow(2, Math.floor(net.height / net.halvingIntervalBlocks));
}
function rewardAtHeight(net, height) {
  return net.baseBlockReward / Math.pow(2, Math.floor(height / net.halvingIntervalBlocks));
}
function mockHash(height, time) {
  let h = (height * 2654435761) ^ (time & 0xffffffff);
  h = (h ^ (h >>> 13)) >>> 0;
  return '0x' + h.toString(16).padStart(8, '0') + (time % 100000).toString(16).padStart(5, '0');
}

function heightForTime(net, nowMs = Date.now()) {
  return Math.max(0, Math.floor((nowMs - net.genesisMs) / (net.blockTimeSec * 1000)));
}
function timeForHeight(net, height) { return net.genesisMs + height * net.blockTimeSec * 1000; }

/* ---- the entity list for the lottery ----
   Each block, one ENTITY wins: a pool, the player's solo field minus player,
   or the player. We model the solo field as: player (if solo) + "independents".
   In pool mode, the player's hashrate is folded into their chosen pool. */
function buildEntities(state) {
  const net = state.network;
  const p = state.player;
  const inPool = net.rewardMode === 'pool' && net.poolId;
  const entities = [];

  for (const pool of state.pools) {
    let hr = pool.hashRate;
    if (inPool && pool.id === net.poolId) hr += p.hashRate; // player joins this pool
    entities.push({ kind:'pool', id:pool.id, name:pool.name, hashRate:hr, fee:pool.fee });
  }

  if (inPool) {
    // player folded into a pool; solo field is just independents
    entities.push({ kind:'independents', id:'independents', name:'Independent miners',
      hashRate: net.soloFieldHash, fee:0 });
  } else {
    // solo: player is their own entity; independents are the rest of the field
    const indep = Math.max(0, net.soloFieldHash - 0); // player hash is ON TOP of global model
    entities.push({ kind:'player', id:'player', name:p.moniker, hashRate: p.hashRate, fee:0 });
    entities.push({ kind:'independents', id:'independents', name:'Independent miners',
      hashRate: indep, fee:0 });
  }
  return entities;
}

function totalEntityHash(entities) { return entities.reduce((s,e)=>s+e.hashRate,0); }

function pickWinner(entities, total, r) {
  let acc = r * total;
  for (let i=0;i<entities.length;i++){ acc -= entities[i].hashRate; if (acc<=0) return i; }
  return entities.length-1;
}

/**
 * Sync chain to wall-clock time. Processes blocks between processed height and
 * the canonical current height. Player earnings depend on solo vs pool mode.
 */
function syncToTime(state, nowMs = Date.now(), maxBlocksPerCall = 5000) {
  const net = state.network;
  const target = heightForTime(net, nowMs);
  if (target <= net.height) return state;

  const from = Math.max(net.height + 1, target - maxBlocksPerCall + 1);
  // If a big gap was skipped, statistically credit it (keeps EV correct without
  // replaying millions of blocks). Uses current hashrate snapshot.
  if (from > net.height + 1) {
    creditSkippedSpan(state, net.height + 1, from - 1);
    net.height = from - 1;
  }
  for (let h = from; h <= target; h++) {
    processBlock(state, h, (target - h) < 60);
  }
  net.height = target;
  net.lastBlockAt = timeForHeight(net, target);
  maybePayPool(state, target, /*force=*/true);
  state.account.balance = state.player.balance;
  return state;
}

/* Statistically credit a skipped span (long offline) without per-block RNG. */
function creditSkippedSpan(state, h0, h1) {
  const net = state.network;
  const p = state.player;
  const entities = buildEntities(state);
  const total = totalEntityHash(entities);
  const n = h1 - h0 + 1;
  if (n <= 0 || total <= 0) return;

  const reward = rewardAtHeight(net, h0); // ~constant across a span (halving is slow)
  const inPool = net.rewardMode === 'pool' && net.poolId;

  if (inPool) {
    const pool = entities.find(e => e.kind==='pool' && e.id===net.poolId);
    const playerShareOfPool = p.hashRate / pool.hashRate;
    const poolWinProb = pool.hashRate / total;
    // expected player BBT = n * reward * poolWinProb * playerShareOfPool * (1-fee)
    const gross = n * reward * poolWinProb * playerShareOfPool;
    const net_ = gross * (1 - pool.fee);
    p.balance += net_; p.pendingPool = 0; p.lastPayoutHeight = h1;
    state.stats.feesPaid += gross * pool.fee;
    state.stats.poolPayouts += 1;
    state.stats.blocksSeen += n;
    state.stats.playerExpectedBlocks += n * (p.hashRate/total);
  } else {
    const playerProb = p.hashRate / total;
    // deterministic-ish: expected whole blocks, plus Bernoulli remainder via RNG
    const expected = n * playerProb;
    let wins = Math.floor(expected);
    const frac = expected - wins;
    if (blockRng(h0)() < frac) wins += 1;
    p.balance += wins * reward; p.blocksWon += wins;
    state.stats.playerBlocksWon += wins;
    state.stats.blocksSeen += n;
    state.stats.playerExpectedBlocks += expected;
  }
}

function processBlock(state, height, record) {
  const net = state.network;
  const p = state.player;
  const reward = rewardAtHeight(net, height);
  const entities = buildEntities(state);
  const total = totalEntityHash(entities);
  const inPool = net.rewardMode === 'pool' && net.poolId;

  // expected-blocks accounting for luck (player's raw share of global)
  const playerGlobalShare = total>0 ? p.hashRate/total : 0;
  state.stats.blocksSeen += 1;
  state.stats.playerExpectedBlocks += playerGlobalShare;

  const rng = blockRng(height);
  const wi = pickWinner(entities, total, rng());
  const winner = entities[wi];

  let playerDelta = 0, playerWon = false;
  if (inPool) {
    const myPool = entities.find(e => e.kind==='pool' && e.id===net.poolId);
    if (winner.id === net.poolId) {
      // our pool won; accrue our fee-adjusted share into pending (paid every ~15min)
      const myShareOfPool = p.hashRate / myPool.hashRate;
      const gross = reward * myShareOfPool;
      const netAmt = gross * (1 - myPool.fee);
      p.pendingPool += netAmt;
      state.stats.feesPaid += gross * myPool.fee;
    }
  } else {
    if (winner.kind === 'player') {
      p.balance += reward; p.blocksWon += 1; playerDelta = reward; playerWon = true;
      state.stats.playerBlocksWon += 1;
    }
  }

  // pay out pending pool earnings on the ~15min cadence
  maybePayPool(state, height, false);

  if (record) {
    const t = timeForHeight(net, height);
    state.blocks.push({
      height, time: t, mode: net.rewardMode,
      winnerKind: winner.kind, winnerId: winner.id, winnerName: winner.name,
      playerWon, playerDelta, reward,
      poolId: inPool ? net.poolId : null,
      txCount: Math.floor(rng()*40), hash: mockHash(height, t),
    });
    if (state.blocks.length > 80) state.blocks = state.blocks.slice(-80);
  }
}

/* Pay accrued pool earnings to balance every POOL_PAYOUT_SEC. */
function maybePayPool(state, height, force) {
  const net = state.network;
  const p = state.player;
  if (net.rewardMode !== 'pool') { return; }
  const payoutEveryBlocks = Math.round(POOL_PAYOUT_SEC / net.blockTimeSec); // 90 blocks
  if (force || (height - p.lastPayoutHeight) >= payoutEveryBlocks) {
    if (p.pendingPool > 0) {
      p.balance += p.pendingPool;
      state.stats.poolPayouts += 1;
      p.pendingPool = 0;
    }
    p.lastPayoutHeight = height;
  }
}

/* ---- ChainSource interface ---- */
function makeMockSource(getState) {
  return {
    getNetwork: () => getState().network,
    getPools: () => getState().pools,
    getPlayer: () => getState().player,
    getLatestBlocks: (n=12) => getState().blocks.slice(-n).reverse(),
    getAccount: () => getState().account,
    getStats: () => getState().stats,
    // validator-style ranked list for the explorer: pools + solo field + player
    getEntities: () => {
      const s = getState();
      const ents = buildEntities(s).slice();
      return ents.sort((a,b)=>b.hashRate-a.hashRate);
    },
  };
}

function setPlayerHashRate(state, hrMH) { state.player.hashRate = Math.max(0, hrMH); }
function setRewardMode(state, mode) { if (mode==='solo'||mode==='pool') state.network.rewardMode = mode; }
function setPool(state, poolId) {
  // null or a valid pool id; switching pools flushes pending to balance first
  maybePayPool(state, state.network.height, true);
  state.network.poolId = poolId;
  if (poolId) state.network.rewardMode = 'pool'; else state.network.rewardMode = 'solo';
  state.player.lastPayoutHeight = state.network.height;
}
function playerLuck(state) {
  const e = state.stats.playerExpectedBlocks;
  return e > 0 ? state.stats.playerBlocksWon / e : 1;
}
function poolById(state, id){ return state.pools.find(p=>p.id===id); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GENESIS_MS, GLOBAL_HASH_MH, POOL_FIELD_FRACTION, POOL_PAYOUT_SEC, DEFAULTS, POOL_DEFS,
    createNetwork, buildPools, currentBlockReward, rewardAtHeight,
    heightForTime, timeForHeight, syncToTime, processBlock, buildEntities, pickWinner,
    makeMockSource, mockHash, setPlayerHashRate, setRewardMode, setPool, playerLuck, poolById, blockRng,
  };
}
