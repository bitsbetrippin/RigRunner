/**
 * chain.js — deterministic mock testnet engine (v0.2.1)
 *
 * KEY CHANGE: the chain is now a pure function of WALL-CLOCK TIME, not of the
 * render loop. Height = floor((now - GENESIS) / blockTimeSec). Every player
 * computes the same height for the same instant — uniform across all clients,
 * independent of device speed or how often the UI ticks.
 *
 * Separation of concerns:
 *   - CHAIN STATE: deterministic timeline of blocks + winners, derived from time
 *     and a per-height hashrate snapshot. Reproducible: same inputs -> same chain.
 *   - PLAYER SIM: the user's rigs set their hashrate, which is their input into
 *     the shared timeline (their win probability per block). Does NOT drive cadence.
 *
 * A ChainSource interface still fronts it so a real server/RPC can replace the
 * mock later.
 */

/* Fixed genesis — shared by all players. (UTC ms.) */
const GENESIS_MS = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z

const DEFAULTS = {
  chainId: 'rigrunner-testnet-1',
  blockTimeSec: 10,
  baseBlockReward: 50,
  halvingIntervalBlocks: 50000,
  decayHalfLifeSec: 3600,
  weightPerHashSec: 1 / 3600,
  rewardMode: 'solo',
};

/* ---- deterministic RNG (so the timeline is reproducible) ---- */
// mulberry32: fast, seedable, good distribution. Same seed -> same stream.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Per-block RNG seeded from height (+ optional salt) — deterministic per height. */
function blockRng(height, salt = 0) {
  return mulberry32(((height + 1) * 2654435761 ^ (salt * 40503)) >>> 0);
}

/** Build genesis network state. Validators carry NPC hashrates; player set live. */
function createNetwork(playerHashRate = 3300) {
  const npc = [
    { id: 'val_npc_1', moniker: 'Hashery',       hashRate: 4200, commissionRate: 0.08 },
    { id: 'val_npc_2', moniker: 'BlockBarn',     hashRate: 2600, commissionRate: 0.12 },
    { id: 'val_npc_3', moniker: 'StakeHouse',    hashRate: 5400, commissionRate: 0.05 },
    { id: 'val_npc_4', moniker: 'GigaWatt Labs', hashRate: 1800, commissionRate: 0.15 },
  ];
  const validators = [
    { id: 'val_player', moniker: 'Dorm Rig', isPlayer: true, hashRate: playerHashRate, commissionRate: 0.10 },
    ...npc.map(n => ({ ...n, isPlayer: false })),
  ].map(v => ({ ...v, stakeWeight: equilibriumWeight(v.hashRate, DEFAULTS),
    selfBalance: 0, blocksWon: 0, uptime: 1, jailed: false }));

  return {
    network: { ...DEFAULTS, genesisMs: GENESIS_MS, height: 0,
      networkHashRate: validators.reduce((s, v) => s + v.hashRate, 0),
      bondedWeight: validators.reduce((s, v) => s + v.stakeWeight, 0),
      lastBlockAt: GENESIS_MS },
    validators,
    blocks: [],
    account: { balance: 0 },
    stats: { playerBlocksWon: 0, playerExpectedBlocks: 0, blocksSeen: 0,
             processedHeight: 0, balanceFromMining: 0 },
  };
}

function equilibriumWeight(H, cfg = DEFAULTS) {
  return H * cfg.weightPerHashSec * cfg.decayHalfLifeSec / Math.LN2;
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
function pickWinner(validators, networkHash, r) {
  let acc = r * networkHash;
  for (let i = 0; i < validators.length; i++) { acc -= validators[i].hashRate; if (acc <= 0) return i; }
  return validators.length - 1;
}

/** The canonical height for a given wall-clock time. Uniform for all players. */
function heightForTime(net, nowMs = Date.now()) {
  return Math.max(0, Math.floor((nowMs - net.genesisMs) / (net.blockTimeSec * 1000)));
}
function timeForHeight(net, height) { return net.genesisMs + height * net.blockTimeSec * 1000; }

/**
 * Sync the chain to wall-clock time. Processes any blocks between the last
 * processed height and the canonical current height. Cadence is purely a
 * function of real elapsed time, so blocks land exactly every blockTimeSec.
 *
 * maxBlocksPerCall caps work after a long absence (we still jump height to
 * current, but only replay reward/stat detail for the most recent N blocks).
 */
function syncToTime(state, nowMs = Date.now(), maxBlocksPerCall = 2000) {
  const net = state.network;
  const target = heightForTime(net, nowMs);
  if (target <= net.height) { net.networkHashRate = sumHash(state); return state; }

  net.networkHashRate = sumHash(state);
  const player = state.validators.find(v => v.isPlayer);

  // only fully process the most recent window; older blocks just advance height
  const from = Math.max(net.height + 1, target - maxBlocksPerCall + 1);
  if (from > net.height + 1) {
    // we skipped a big gap (long offline) — account expected/won statistically
    // for the skipped span using current hashrate snapshot (approximation).
    const skipped = from - 1 - net.height;
    const share = net.networkHashRate > 0 ? player.hashRate / net.networkHashRate : 0;
    state.stats.blocksSeen += skipped;
    state.stats.playerExpectedBlocks += skipped * share;
    // credit expected winnings across the skip (smooth, avoids replaying RNG)
    let credited = 0, wins = 0;
    for (let h = net.height + 1; h < from; h++) {
      const rew = rewardAtHeight(net, h);
      // expected value contribution
      credited += rew * share;
    }
    if (net.rewardMode === 'solo') {
      // convert expected value into whole-block wins probabilistically but
      // deterministically per height so it stays uniform
      for (let h = net.height + 1; h < from; h++) {
        const rng = blockRng(h);
        const wi = pickWinner(state.validators, net.networkHashRate, rng());
        if (state.validators[wi].isPlayer) { player.selfBalance += rewardAtHeight(net, h); player.blocksWon++; wins++; state.stats.playerBlocksWon++; }
        else state.validators[wi].selfBalance += rewardAtHeight(net, h);
      }
    } else {
      for (const v of state.validators) {
        const s = net.networkHashRate > 0 ? v.hashRate / net.networkHashRate : 0;
        for (let h = net.height + 1; h < from; h++) v.selfBalance += rewardAtHeight(net, h) * s;
      }
    }
    net.height = from - 1;
  }

  for (let h = from; h <= target; h++) {
    processBlock(state, h, /*record=*/ (target - h) < 60);
  }
  net.height = target;
  net.lastBlockAt = timeForHeight(net, target);
  net.networkHashRate = sumHash(state);
  state.account.balance = player.selfBalance;
  return state;
}

function sumHash(state){ return state.validators.reduce((s,v)=>s+v.hashRate,0); }

/** Process exactly one block at a given height. Deterministic given height + hashrates. */
function processBlock(state, height, record) {
  const net = state.network;
  const player = state.validators.find(v => v.isPlayer);
  const netHash = net.networkHashRate;
  const reward = rewardAtHeight(net, height);
  const share = netHash > 0 ? player.hashRate / netHash : 0;

  state.stats.blocksSeen += 1;
  state.stats.playerExpectedBlocks += share;

  const rng = blockRng(height);
  let distribution = {}, winnerId = null, winnerMoniker = null;

  if (net.rewardMode === 'pool') {
    for (const v of state.validators) {
      const s = netHash > 0 ? v.hashRate / netHash : 0;
      const amt = reward * s; v.selfBalance += amt; if (record) distribution[v.id] = amt;
    }
    const wi = pickWinner(state.validators, netHash, rng());
    winnerId = state.validators[wi].id; winnerMoniker = state.validators[wi].moniker;
    if (winnerId === player.id) { player.blocksWon++; state.stats.playerBlocksWon++; }
  } else {
    const wi = pickWinner(state.validators, netHash, rng());
    const winner = state.validators[wi];
    winner.selfBalance += reward; winner.blocksWon++;
    if (record) distribution[winner.id] = reward;
    winnerId = winner.id; winnerMoniker = winner.moniker;
    if (winner.isPlayer) state.stats.playerBlocksWon++;
  }

  if (record) {
    const t = timeForHeight(net, height);
    state.blocks.push({ height, time: t, mode: net.rewardMode, winner: winnerId,
      winnerMoniker, playerWon: winnerId === player.id, reward,
      txCount: Math.floor(rng() * 40), hash: mockHash(height, t), distribution });
    if (state.blocks.length > 60) state.blocks = state.blocks.slice(-60);
  }
}

function makeMockSource(getState) {
  return {
    getNetwork: () => getState().network,
    getValidators: () => getState().validators.slice().sort((a, b) => b.hashRate - a.hashRate),
    getLatestBlocks: (n = 12) => getState().blocks.slice(-n).reverse(),
    getAccount: () => getState().account,
    getPlayer: () => getState().validators.find(v => v.isPlayer),
    getStats: () => getState().stats,
  };
}

function setPlayerHashRate(state, hr) {
  const p = state.validators.find(v => v.isPlayer);
  if (p) p.hashRate = Math.max(0, hr);
  state.network.networkHashRate = sumHash(state);
}
function setRewardMode(state, mode) { if (mode === 'solo' || mode === 'pool') state.network.rewardMode = mode; }
function playerLuck(state) {
  const e = state.stats.playerExpectedBlocks;
  return e > 0 ? state.stats.playerBlocksWon / e : 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GENESIS_MS, DEFAULTS, createNetwork, equilibriumWeight, currentBlockReward, rewardAtHeight,
    heightForTime, timeForHeight, syncToTime, processBlock, pickWinner, makeMockSource,
    mockHash, setPlayerHashRate, setRewardMode, playerLuck, blockRng,
  };
}
