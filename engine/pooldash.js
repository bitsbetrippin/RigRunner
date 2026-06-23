/**
 * pooldash.js — virtual NPC rig rosters for pool dashboards (v0.7)
 *
 * Each pool's hashrate (from chain.js) is "made up" of many virtual NPC miners.
 * We deterministically synthesize a roster of userID.rigname entries whose
 * hashrates sum to (approximately) the pool's total. The player's own rigs are
 * injected on top when they're pointed at that pool.
 *
 * Deterministic from pool id + a seed so the roster is stable across renders.
 */

function mulberry32(seed){ let a=seed>>>0; return function(){ a|=0;a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

const ADJ=['crypto','hash','mega','turbo','silent','frost','volt','nova','iron','lucky','shadow','solar','rapid','quantum','atomic','cyber','blaze','glacier','titan','pixel'];
const NOUN=['miner','rig','farm','node','forge','vault','works','labs','byte','core','stack','grid','den','hub','pit','yard','co','syndicate','collective','crew'];
const RIGN=['alpha','bravo','rack01','rack02','beast','workhorse','garage','basement','attic','shed','prod','main','spare','frankenrig','heater','monster','sled','tower','bench','array'];

/* Make a believable handle from a seed. */
function handle(rng){
  const a=ADJ[Math.floor(rng()*ADJ.length)];
  const n=NOUN[Math.floor(rng()*NOUN.length)];
  const num=Math.floor(rng()*900+100);
  return a+'_'+n+num;
}

/* Build a roster of NPC rigs for a pool whose hashrates ~ sum to poolHashMH.
   Returns { miners:[{user, rigs:[{name, hashMH}], total}], totalMH, count } */
function poolRoster(poolId, poolHashMH, opts){
  opts=opts||{};
  const seed=hashStr(poolId);
  const rng=mulberry32(seed);
  // number of distinct NPC miners scales with pool size (capped for UI)
  const target=poolHashMH;
  const miners=[];
  let assigned=0;
  // generate miners until we've covered ~the pool hashrate
  let guard=0;
  while(assigned < target*0.985 && guard<4000){
    guard++;
    const user=handle(rng);
    const rigCount=1+Math.floor(rng()*4); // 1–4 rigs per miner
    const rigs=[];
    let mTotal=0;
    for(let r=0;r<rigCount;r++){
      // each rig 50–1200 MH/s, weighted small
      const base=50+Math.pow(rng(),2)*1150;
      const hashMH=Math.round(base);
      rigs.push({ name: user+'.'+RIGN[Math.floor(rng()*RIGN.length)]+(r? (r+1):''), hashMH });
      mTotal+=hashMH;
    }
    if(assigned+mTotal > target){ // trim last to fit
      const over=assigned+mTotal-target;
      if(rigs.length && over>0 && rigs[rigs.length-1].hashMH>over){ rigs[rigs.length-1].hashMH-=Math.round(over); mTotal-=Math.round(over); }
    }
    miners.push({ user, rigs, total:mTotal });
    assigned+=mTotal;
  }
  return { miners, totalMH:assigned, count:miners.length };
}

/* Summaries for the pool dashboard list (top miners + counts), capped for UI. */
function poolSummary(poolId, poolHashMH, topN){
  const roster=poolRoster(poolId, poolHashMH);
  const sorted=roster.miners.slice().sort((a,b)=>b.total-a.total);
  return { count:roster.count, totalMH:roster.totalMH,
    top: sorted.slice(0, topN||12),
    rigCount: roster.miners.reduce((s,m)=>s+m.rigs.length,0) };
}

if (typeof module!=='undefined' && module.exports){
  module.exports={ poolRoster, poolSummary, handle };
}
