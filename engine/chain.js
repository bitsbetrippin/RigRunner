/**
 * chain.js — mock testnet simulation engine
 *
 * Pure logic, no I/O, no DOM. Implements the model in ARCHITECTURE.md:
 *   work -> decaying stake-weight -> PoS reward split with commission.
 * A thin ChainSource interface sits on top so a real Tendermint RPC can replace
 * the mock later without touching the dashboards.
 */

const DEFAULTS = {
  chainId: 'rigrunner-testnet-1',
  blockTimeSec: 6,
  baseBlockReward: 5,
  decayHalfLifeSec: 3600,
  weightPerHashSec: 1 / 3600,   // weight measured in "hash-hours"
  proposerBonusPct: 0.05,
};

/** Build a fresh mock network: player + 4 NPC validators. */
function createNetwork(playerHashRate = 3300, now = Date.now()) {
  const npc = [
    { id: 'val_npc_1', moniker: 'Hashery',       hashRate: 4200, commissionRate: 0.08 },
    { id: 'val_npc_2', moniker: 'BlockBarn',     hashRate: 2600, commissionRate: 0.12 },
    { id: 'val_npc_3', moniker: 'StakeHouse',    hashRate: 5400, commissionRate: 0.05 },
    { id: 'val_npc_4', moniker: 'GigaWatt Labs', hashRate: 1800, commissionRate: 0.15 },
  ];
  const validators = [
    { id: 'val_player', moniker: 'Dorm Rig', isPlayer: true,
      hashRate: playerHashRate, commissionRate: 0.10 },
    ...npc.map(n => ({ ...n, isPlayer: false })),
  ].map(v => ({
    ...v,
    // seed each near its equilibrium so the network starts "warm"
    stakeWeight: equilibriumWeight(v.hashRate, DEFAULTS),
    selfBalance: 0, delegatorPool: 0, uptime: 1, jailed: false,
  }));

  return {
    network: {
      ...DEFAULTS,
      height: 0,
      bondedWeight: validators.reduce((s, v) => s + v.stakeWeight, 0),
      lastBlockAt: now,
      createdAt: now,
    },
    validators,
    blocks: [],
    account: { balance: 0, pendingRewards: 0 },
  };
}

/** Equilibrium weight for a constant hash rate H: W* = H * wph * halfLife / ln2. */
function equilibriumWeight(H, cfg = DEFAULTS) {
  return H * cfg.weightPerHashSec * cfg.decayHalfLifeSec / Math.LN2;
}

/** Deterministic-ish mock block hash from height+time. */
function mockHash(height, time) {
  let h = (height * 2654435761) ^ (time & 0xffffffff);
  h = (h ^ (h >>> 13)) >>> 0;
  return '0x' + h.toString(16).padStart(8, '0') + (time % 100000).toString(16).padStart(5, '0');
}

/** Seeded PRNG so proposer selection is reproducible per (height). */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Pick a proposer index weighted by stakeWeight. */
function pickProposer(validators, bondedWeight, rand) {
  let r = rand() * bondedWeight;
  for (let i = 0; i < validators.length; i++) {
    r -= validators[i].stakeWeight;
    if (r <= 0) return i;
  }
  return validators.length - 1;
}

/**
 * Advance the chain by `dtSec` seconds of simulated time.
 * Mutates and returns state. Pure w.r.t. inputs (deterministic given seedSalt).
 * `maxCatchupSec` caps offline fast-forward.
 */
function advance(state, dtSec, maxCatchupSec = 24 * 3600) {
  const cfg = state.network;
  let remaining = Math.min(Math.max(0, dtSec), maxCatchupSec);

  // We step in block-sized chunks so weight + blocks stay consistent.
  const step = cfg.blockTimeSec;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    remaining -= dt;

    // 1. decay + work gain for every validator
    const decay = Math.pow(0.5, dt / cfg.decayHalfLifeSec);
    for (const v of state.validators) {
      const gain = v.hashRate * cfg.weightPerHashSec * dt;
      v.stakeWeight = v.stakeWeight * decay + gain;
    }
    // 2. recompute bonded weight
    cfg.bondedWeight = state.validators.reduce((s, v) => s + v.stakeWeight, 0);

    // 3. produce a block if it's time
    cfg.lastBlockAt += dt * 1000;
    if (dt >= step - 1e-9 && cfg.bondedWeight > 0) {
      produceBlock(state);
    }
  }
  return state;
}

function produceBlock(state) {
  const cfg = state.network;
  cfg.height += 1;
  const rand = rng(cfg.height * 2246822519);
  const pIdx = pickProposer(state.validators, cfg.bondedWeight, rand);
  const proposer = state.validators[pIdx];

  const distribution = {};
  let minted = 0;
  for (const v of state.validators) {
    const share = v.stakeWeight / cfg.bondedWeight;
    let gross = cfg.baseBlockReward * share;
    if (v.id === proposer.id) gross += cfg.baseBlockReward * cfg.proposerBonusPct;
    const commission = gross * v.commissionRate;
    const delegated = gross - commission;
    // player is self-delegated in v0.1 -> gets full gross
    if (v.isPlayer) { v.selfBalance += gross; }
    else { v.selfBalance += commission; v.delegatorPool += delegated; }
    distribution[v.id] = gross;
    minted += gross;
  }
  state.account.balance = state.validators.find(v => v.isPlayer).selfBalance;

  state.blocks.push({
    height: cfg.height,
    time: cfg.lastBlockAt,
    proposer: proposer.id,
    proposerMoniker: proposer.moniker,
    reward: minted,
    txCount: Math.floor(rand() * 40),
    hash: mockHash(cfg.height, cfg.lastBlockAt),
    distribution,
  });
  // cap stored blocks
  if (state.blocks.length > 50) state.blocks = state.blocks.slice(-50);
}

/** ChainSource interface — the seam a real RPC will implement later. */
function makeMockSource(getState) {
  return {
    getNetwork: () => getState().network,
    getValidators: () => getState().validators.slice().sort((a, b) => b.stakeWeight - a.stakeWeight),
    getLatestBlocks: (n = 12) => getState().blocks.slice(-n).reverse(),
    getAccount: () => getState().account,
    getPlayer: () => getState().validators.find(v => v.isPlayer),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULTS, createNetwork, equilibriumWeight, advance, produceBlock, pickProposer, makeMockSource, mockHash, rng };
}

/* Integration helper: set the player validator's hash rate (e.g. rig online/offline,
   or future GPU upgrades). Keeps the economy driven by the room's rig. */
function setPlayerHashRate(state, hr){
  const p = state.validators.find(v => v.isPlayer);
  if (p) p.hashRate = Math.max(0, hr);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.setPlayerHashRate = setPlayerHashRate;
}
