/**
 * market.js — exchange price/candle engine (v0.7)
 *
 * One engine, deterministic from the shared world genesis so all slots see the
 * same market. Produces 1-minute OHLC candles + volume, synthesized from a price
 * process with volatility REGIMES:
 *   - NORMAL: gentle drift, ~2% per 15 min, bounded so daily range stays ~5–11%.
 *   - EVENT (rare): 3–5 min bursts of 15–20% directional moves, up or down.
 *
 * Determinism: candle at minute M is a pure function of (genesis, M, basePrice).
 * basePrice is the world's current simulated BBT price; the engine shapes the
 * intra-history candles around it so the latest close ~ basePrice.
 */

const MIN_MS = 60*1000;

/* seeded RNG (mulberry32) keyed per-minute for reproducible candles */
function rng32(seed){ let a=seed>>>0; return function(){ a|=0;a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function minuteSeed(genesisMs, minuteIndex, salt){ return (((minuteIndex+1)*2654435761) ^ ((salt||0)*40503) ^ (Math.floor(genesisMs/60000))) >>> 0; }

/* Is minute M inside a rare volatile event? Events are deterministic, sparse,
   last 3–5 min. We mark an event "start" roughly once every ~180–260 min. */
function eventStateAt(genesisMs, M){
  // find the most recent event-start <= M within a 320-min lookback
  for(let k=0;k<=320;k++){
    const m=M-k;
    const r=rng32(minuteSeed(genesisMs,m,7))();
    if(r<0.005){ // ~0.5%/min => an event roughly every ~200 min
      const lenR=rng32(minuteSeed(genesisMs,m,8))();
      const len=3+Math.floor(lenR*3); // 3–5 min
      if(k<len){
        const dirR=rng32(minuteSeed(genesisMs,m,9))();
        const dir=dirR<0.5?-1:1;
        const magR=rng32(minuteSeed(genesisMs,m,10))();
        const mag=0.15+magR*0.05; // 15–20% total move across the event
        return { inEvent:true, dir, perMin:mag/len, idxInEvent:k, len };
      }
      return { inEvent:false };
    }
  }
  return { inEvent:false };
}

/* Per-minute log-return: small normal drift + event bursts. Bounded. */
function minuteReturn(genesisMs, M){
  const ev=eventStateAt(genesisMs,M);
  if(ev.inEvent){
    const noise=(rng32(minuteSeed(genesisMs,M,11))()-0.5)*0.01;
    return ev.dir*ev.perMin + noise;
  }
  // normal regime: tiny drift, mean-reverting noise (~2% per 15 min => ~0.13%/min std)
  const r=rng32(minuteSeed(genesisMs,M,12))();
  const drift=(r-0.5)*0.0026;           // +/-0.13% per min
  const wob=(rng32(minuteSeed(genesisMs,M,13))()-0.5)*0.004;
  return drift+wob;
}

/* Build N one-minute candles ending at the minute containing nowMs.
   anchorPrice is the world price; we generate returns backward so the last
   close lands on anchorPrice, giving a stable, continuous-looking history. */
function buildCandles(genesisMs, nowMs, anchorPrice, count){
  count=count||60;
  const curMin=Math.floor((nowMs-genesisMs)/MIN_MS);
  // reconstruct close prices backward from anchorPrice
  const closes=new Array(count);
  let price=anchorPrice;
  for(let i=count-1;i>=0;i--){
    closes[i]=price;
    const ret=minuteReturn(genesisMs, curMin-(count-1-i));
    price=price/(1+ret); // step backward
  }
  const candles=[];
  for(let i=0;i<count;i++){
    const M=curMin-(count-1-i);
    const open=i===0?closes[0]/(1+minuteReturn(genesisMs,M)):closes[i-1];
    const close=closes[i];
    const ev=eventStateAt(genesisMs,M);
    const range=Math.abs(close-open)+ (ev.inEvent? close*0.01 : close*0.003)*(0.5+rng32(minuteSeed(genesisMs,M,14))());
    const hi=Math.max(open,close)+range*0.5;
    const lo=Math.min(open,close)-range*0.5;
    // volume: higher during events and on bigger moves
    const baseVol= (0.6+rng32(minuteSeed(genesisMs,M,15))()*0.8);
    const vol=baseVol*(ev.inEvent?2.6:1)*(1+Math.abs(close-open)/close*40);
    candles.push({ M, t:genesisMs+M*MIN_MS, open, high:hi, low:Math.max(0.0001,lo), close,
      up:close>=open, vol, event:!!ev.inEvent });
  }
  return candles;
}

/* Aggregate 1-min candles into a coarser interval (in minutes). */
const INTERVALS = { '1m':1, '5m':5, '1h':60, '1d':1440, '1w':10080 };
function buildCandlesInterval(genesisMs, nowMs, anchorPrice, intervalKey, count){
  const mins=INTERVALS[intervalKey]||1;
  count=count||60;
  if(mins===1) return buildCandles(genesisMs, nowMs, anchorPrice, count);
  const total=mins*count;
  const fine=buildCandles(genesisMs, nowMs, anchorPrice, total);
  const out=[];
  for(let b=0;b<count;b++){
    const slice=fine.slice(b*mins,(b+1)*mins);
    if(!slice.length) continue;
    const open=slice[0].open, close=slice[slice.length-1].close;
    const high=Math.max(...slice.map(c=>c.high)), low=Math.min(...slice.map(c=>c.low));
    const vol=slice.reduce((s,c)=>s+c.vol,0);
    const event=slice.some(c=>c.event);
    out.push({ M:slice[0].M, t:slice[0].t, open, high, low, close, up:close>=open, vol, event });
  }
  return out;
}

if (typeof module!=='undefined' && module.exports){
  module.exports={ MIN_MS, INTERVALS, buildCandles, buildCandlesInterval, eventStateAt, minuteReturn };
}
