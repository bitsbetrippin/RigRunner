/**
 * electrical.js — circuit / amperage model per location (v0.8)
 *
 * Real residential/light-commercial electrical limits drive a SOFT CAP: rigs can
 * be plugged in, but drawing past a circuit's safe capacity (80% of breaker, per
 * code) warns and trips the breaker (throttle). Watts -> amps at the circuit volts.
 *
 * Layouts:
 *  - Dorm:   single 20A / 120V circuit (one rig realistically).
 *  - Garage: two 30A / 240V circuits (a pair of dryer-style connections).
 *  - Shack:  200A service split into 6x 30A breaker panels, each feeding a
 *            6-plug PDU => 36 plugs total, supporting up to ~18 rigs.
 *
 * NEC continuous-load rule: usable load = 80% of breaker rating.
 */

const ELECTRICAL = {
  dorm: {
    service:'120V single circuit',
    circuits:[ { id:'d-c1', name:'Wall Circuit 1', amps:20, volts:120, plugs:2 } ],
  },
  garage: {
    service:'240V dual circuit',
    circuits:[
      { id:'g-c1', name:'240V Circuit A', amps:30, volts:240, plugs:3 },
      { id:'g-c2', name:'240V Circuit B', amps:30, volts:240, plugs:3 },
    ],
  },
  shack: {
    service:'200A service',
    circuits:(function(){
      const c=[]; for(let i=1;i<=6;i++) c.push({ id:'s-p'+i, name:'Panel '+i+' (PDU)', amps:30, volts:240, plugs:6 });
      return c; // 6 panels x 6 plugs = 36 plugs
    })(),
  },
};

const SAFE_FACTOR = 0.80; // NEC continuous-load: 80% of breaker

function circuitCapacityW(c){ return c.amps * c.volts * SAFE_FACTOR; } // safe continuous watts
function circuitMaxW(c){ return c.amps * c.volts; }                    // hard breaker watts
function ampsFromW(watts, volts){ return watts / volts; }

/* Distribute a location's rigs across its circuits (round-robin by plug capacity)
   and compute per-circuit load. Returns status incl. trip flags. */
function locationPower(locId, rigs, rigWattsFn){
  const layout=ELECTRICAL[locId]; if(!layout) return null;
  const circuits=layout.circuits.map(c=>({ ...c, rigs:[], watts:0, plugsUsed:0 }));
  const totalPlugs=circuits.reduce((s,c)=>s+c.plugs,0);
  // assign rigs to circuits, filling each circuit's plugs before moving on
  let ci=0;
  rigs.forEach(r=>{
    // find next circuit with a free plug
    let guard=0;
    while(circuits[ci].plugsUsed>=circuits[ci].plugs && guard<circuits.length){ ci=(ci+1)%circuits.length; guard++; }
    const c=circuits[ci];
    if(c.plugsUsed<c.plugs){ c.rigs.push(r); c.plugsUsed++; c.watts+=rigWattsFn(r); }
    ci=(ci+1)%circuits.length;
  });
  circuits.forEach(c=>{
    c.amps_draw = ampsFromW(c.watts, c.volts);
    c.capacityW = circuitCapacityW(c);
    c.maxW = circuitMaxW(c);
    c.loadPct = c.capacityW>0 ? c.watts/c.capacityW : 0;     // vs safe (80%) limit
    c.overSafe = c.watts > c.capacityW;                       // warn
    c.tripped = c.watts > c.maxW;                             // breaker trips (hard)
  });
  const totalW=circuits.reduce((s,c)=>s+c.watts,0);
  const usedPlugs=circuits.reduce((s,c)=>s+c.plugsUsed,0);
  return { locId, service:layout.service, circuits, totalW, totalPlugs, usedPlugs,
    anyOverSafe:circuits.some(c=>c.overSafe), anyTripped:circuits.some(c=>c.tripped) };
}

if (typeof module!=='undefined' && module.exports){
  module.exports={ ELECTRICAL, SAFE_FACTOR, circuitCapacityW, circuitMaxW, ampsFromW, locationPower };
}
