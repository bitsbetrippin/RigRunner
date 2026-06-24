/**
 * electrical.js — power topology + 3-stage fault model (v0.9)
 *
 * SINGLE SOURCE OF TRUTH for each location's electrical system. The room view,
 * the rig state, and the Power page all read from here so they stay in sync.
 *
 * Three protective stages in SERIES, per real mining practice (trips in this
 * order as load climbs): PDU breaker -> Kilowatt-meter/outlet breaker -> wall
 * service-panel fuse. Each stays tripped until manually reset at its stage.
 *
 * Topology per location:
 *  - Dorm:   1x 20A/120V wall circuit -> 2x Kilowatt meters (C13 plugs). 2 rigs.
 *  - Garage: 2x 30A/240V circuits -> 2 PDUs, each 6x C19 plugs. (panel 100A)
 *  - Shed:   200A panel, 8x 30A/240V -> 8 PDUs (4 left + 4 right), 6x C19 each.
 *
 * Plug-level: rigs are manually assigned to a specific meter/PDU outlet (slot).
 */

const SAFE_FACTOR = 0.80;           // NEC continuous-load: usable = 80% of breaker
const PARASITIC_PCT = 0.001;        // ~0.1% parasitic loss

/* Per-location topology. `panel` = service panel fuse rating.
   Stages reference art keys consumed by the Power page. */
const POWER_TOPOLOGY = {
  dorm: {
    name:'Dorm Room',
    panel:{ id:'dorm-panel', amps:50, art:'assets/dorm-fusebox.png',
      label:'College Dorm Panel \u00b7 50A', fuses:[
        { id:'dorm-f-rig', name:'RIG', feeds:'circuit', amps:20, volts:120 } ] },
    // one 20A/120V circuit feeding 2 Kilowatt meters (each a C13 plug)
    circuits:[ { id:'dorm-c1', amps:20, volts:120, panelFuse:'dorm-f-rig',
      meters:[
        { id:'dorm-m1', kind:'meter', plug:'C13', amps:20, volts:120, art:'assets/dormroom-killawatt.png', meteridx:0 },
        { id:'dorm-m2', kind:'meter', plug:'C13', amps:20, volts:120, art:'assets/dormroom-killawatt.png', meteridx:1 },
      ] } ],
    meterArt:'assets/dormroom-killawatt.png', meterCount:2,
    pdus:[], sides:false,
  },
  garage: {
    name:'Home Garage',
    panel:{ id:'gar-panel', amps:100, art:'assets/garage-fusebox.png',
      label:'Garage Panel \u00b7 100A', fuses:[
        { id:'gar-f-r1', name:'240V RIG #1', feeds:'circuit', amps:30, volts:240 },
        { id:'gar-f-r2', name:'240V RIG #2', feeds:'circuit', amps:30, volts:240 } ] },
    circuits:[
      { id:'gar-c1', amps:30, volts:240, panelFuse:'gar-f-r1',
        meters:[ { id:'gar-mtr1', kind:'meter', plug:'240V', amps:30, volts:240, art:'assets/garage-killawatt.png', meteridx:0 } ],
        pdu:{ id:'gar-pdu1', plugs:6, plugType:'C19', amps:30, volts:240, art:'assets/miningshed-pdu.png' } },
      { id:'gar-c2', amps:30, volts:240, panelFuse:'gar-f-r2',
        meters:[ { id:'gar-mtr2', kind:'meter', plug:'240V', amps:30, volts:240, art:'assets/garage-killawatt.png', meteridx:1 } ],
        pdu:{ id:'gar-pdu2', plugs:6, plugType:'C19', amps:30, volts:240, art:'assets/miningshed-pdu.png' } },
    ],
    meterArt:'assets/garage-killawatt.png', meterCount:2,
    sides:false,
  },
  shack: {
    name:'Mining Shed',
    panel:{ id:'shed-panel', amps:200, art:'assets/miningshed-fusebox.png',
      label:'Mining Shed Panel \u00b7 200A', fuses:(function(){ const f=[]; for(let i=1;i<=8;i++) f.push({ id:'shed-f-r'+i, name:'RIGS #'+i, feeds:'circuit', amps:30, volts:240 }); return f; })() },
    // 8x 30A/240V -> 8 PDUs, 4 left + 4 right
    circuits:(function(){ const c=[]; for(let i=1;i<=8;i++){ const side=i<=4?'left':'right';
      c.push({ id:'shed-c'+i, amps:30, volts:240, panelFuse:'shed-f-r'+i, side,
        meters:[ { id:'shed-mtr'+i, kind:'meter', plug:'240V', amps:30, volts:240, art:'assets/miningshed-Killawatt.png', meteridx:i-1 } ],
        pdu:{ id:'shed-pdu'+i, plugs:6, plugType:'C19', amps:30, volts:240, art:'assets/miningshed-pdu.png', side } }); }
      return c; })(),
    meterArt:'assets/miningshed-Killawatt.png', meterCount:8,
    sides:true,
  },
};

function circuitSafeW(c){ return c.amps*c.volts*SAFE_FACTOR; }
function circuitMaxW(c){ return c.amps*c.volts; }
function ampsFromW(w, v){ return v>0 ? w/v : 0; }

/* total plug slots across a location (for capacity display) */
function locationPlugCount(locId){
  const t=POWER_TOPOLOGY[locId]; if(!t) return 0;
  let n=0; t.circuits.forEach(c=>{ if(c.pdu) n+=c.pdu.plugs; else if(c.meters) n+=c.meters.length; });
  return n;
}

/**
 * Compute live power state for a location given:
 *   rigs: [{id, watts, on}]  (on = PDU power switch state; default true)
 *   assign: { rigId: slotId } manual plug assignment (slotId = meter id or pdu-plug id)
 *   trips: Set of tripped stage ids (persisted on the slot)
 * Returns a full tree with per-stage load + trip status and a one-line graph.
 */
function computePower(locId, rigs, assign, trips){
  const t=POWER_TOPOLOGY[locId]; if(!t) return null;
  trips=trips||new Set();
  assign=assign||{};
  const rigById={}; rigs.forEach(r=>rigById[r.id]=r);

  // map slot -> rig
  const slotRig={};
  Object.keys(assign).forEach(rigId=>{ const slot=assign[rigId]; if(rigById[rigId]) slotRig[slot]=rigById[rigId]; });

  const circuits=t.circuits.map(c=>{
    const pduTripped = c.pdu ? trips.has(c.pdu.id) : false;
    // gather rigs on this circuit's PDU plugs or meters
    let plugs=[];
    if(c.pdu){
      for(let p=0;p<c.pdu.plugs;p++){ const slot=c.pdu.id+':p'+p; const rig=slotRig[slot]||null;
        plugs.push({ slot, rig, watts: rig&&rig.on!==false&&!pduTripped ? rig.watts:0 }); }
    }
    const meters=(c.meters||[]).map(m=>{
      const slot=m.id; const rig=slotRig[slot]||null;
      const meterTripped=trips.has(m.id);
      // a meter feeding a PDU sums the PDU; a direct meter (dorm) meters its own rig
      let watts=0;
      if(c.pdu){ watts=plugs.reduce((s,p)=>s+p.watts,0); }
      else { watts = rig&&rig.on!==false&&!meterTripped ? rig.watts:0; }
      return { ...m, slot, rig, tripped:meterTripped, watts };
    });
    const circuitWatts = c.pdu ? plugs.reduce((s,p)=>s+p.watts,0) : meters.reduce((s,m)=>s+m.watts,0);
    const panelTripped = trips.has(c.panelFuse);
    const effWatts = panelTripped?0:circuitWatts;
    return { ...c, plugs, meters, pdu:c.pdu?{...c.pdu, tripped:pduTripped}:null,
      watts:effWatts, rawWatts:circuitWatts,
      ampsDraw:ampsFromW(effWatts,c.volts), safeW:circuitSafeW(c), maxW:circuitMaxW(c),
      overSafe: circuitWatts>circuitSafeW(c), tripped: panelTripped };
  });

  const totalW=circuits.reduce((s,c)=>s+c.watts,0);
  const parasiticW=totalW*PARASITIC_PCT;
  const panelAmps=ampsFromW(totalW,240);
  const panelMax=t.panel.amps;
  return {
    locId, name:t.name, sides:t.sides,
    panel:{ ...t.panel, watts:totalW, amps:panelAmps, max:panelMax,
      overSafe: panelAmps>panelMax*SAFE_FACTOR, tripped: trips.has(t.panel.id) },
    circuits, totalW, parasiticW, deliveredW: totalW-parasiticW,
    plugCount: locationPlugCount(locId),
  };
}

/* Evaluate auto-trips: if a stage exceeds its breaker (hard max), it trips.
   Order matters — PDU first, then meter, then panel fuse. Returns new trips set
   (additions only; resets are manual). */
function evaluateTrips(locId, rigs, assign, trips){
  const t=POWER_TOPOLOGY[locId]; if(!t) return trips;
  trips=new Set(trips||[]);
  const rigById={}; rigs.forEach(r=>rigById[r.id]=r);
  const slotRig={}; Object.keys(assign||{}).forEach(rigId=>{ if(rigById[rigId]) slotRig[assign[rigId]]=rigById[rigId]; });

  t.circuits.forEach(c=>{
    // PDU stage
    if(c.pdu){
      let pduW=0; for(let p=0;p<c.pdu.plugs;p++){ const r=slotRig[c.pdu.id+':p'+p]; if(r&&r.on!==false) pduW+=r.watts; }
      if(pduW>circuitMaxW(c.pdu)) trips.add(c.pdu.id);
    }
    // meter stage (only counts load not already cut by a tripped PDU)
    (c.meters||[]).forEach(m=>{
      let mW=0;
      if(c.pdu){ if(!trips.has(c.pdu.id)){ for(let p=0;p<c.pdu.plugs;p++){ const r=slotRig[c.pdu.id+':p'+p]; if(r&&r.on!==false) mW+=r.watts; } } }
      else { const r=slotRig[m.id]; if(r&&r.on!==false) mW+=r.watts; }
      if(mW>circuitMaxW(m)) trips.add(m.id);
    });
  });
  // panel stage: total un-cut load vs panel
  let total=0;
  t.circuits.forEach(c=>{
    if(c.pdu){ if(trips.has(c.pdu.id))return; for(let p=0;p<c.pdu.plugs;p++){ const r=slotRig[c.pdu.id+':p'+p]; if(r&&r.on!==false&&!trips.has(c.meters[0]&&c.meters[0].id)) total+=r.watts; } }
    else { (c.meters||[]).forEach(m=>{ if(trips.has(m.id))return; const r=slotRig[m.id]; if(r&&r.on!==false) total+=r.watts; }); }
  });
  if(ampsFromW(total,240) > t.panel.amps) trips.add(t.panel.id);
  return trips;
}

if (typeof module!=='undefined' && module.exports){
  module.exports={ POWER_TOPOLOGY, SAFE_FACTOR, PARASITIC_PCT,
    circuitSafeW, circuitMaxW, ampsFromW, locationPlugCount, computePower, evaluateTrips };
}
