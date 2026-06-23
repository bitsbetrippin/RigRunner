/**
 * locations.js — location catalog + rig hotspot maps (v0.4)
 *
 * Each location is a buyable "site" containing N independent rigs (one per rig
 * frame in the art). Dorm is free and auto-owned; others cost BBT.
 *
 * RIG_PCT entries are hotspot rectangles as fractions of the location image,
 * measured from the art. Each becomes a tappable rig.
 */

const LOCATIONS = {
  dorm: {
    id:'dorm', name:'Dorm Room', img:'assets/room.png', price:0, free:true,
    blurb:'A single rig on the desk. Where everyone starts.',
    rigSpots:[ {left:57.5, top:58.5, width:23.0, height:14.5} ], // 1 rig (existing)
  },
  garage: {
    id:'garage', name:'Home Garage', img:'assets/garage.png', price:100,
    blurb:'A 2x2 shelf of rigs beside the car. Four times the dorm.',
    rigSpots:[
      {left:59.5, top:41, width:11, height:9},
      {left:74.5, top:41, width:11, height:9},
      {left:59.5, top:56, width:11, height:9},
      {left:74.5, top:56, width:11, height:9},
    ], // 4 rigs
  },
  shack: {
    id:'shack', name:'Mining Shack', img:'assets/mining_shack.png', price:200,
    blurb:'A dedicated shack: two racks of five. A serious farm.',
    rigSpots:(function(){
      const rows=[20.5,35,49.5,64,78.5]; const spots=[];
      rows.forEach(y=>{ spots.push({left:25.5-7, top:y-3.5, width:14, height:7});
                        spots.push({left:70.5-7, top:y-3.5, width:14, height:7}); });
      return spots;
    })(), // 10 rigs
  },
};
const SHOP_ORDER = ['dorm','garage','shack'];

/* Default rig config — same base as the dorm rig for every location's rigs. */
function defaultRig(locId, idx){
  return { id: locId+'_rig'+(idx+1), label: 'Rig '+String(idx+1).padStart(2,'0'),
    gpu:'rx6800', count:6, power:'normal', state:'OFFLINE', shares:0, jobId:1 };
}
function makeLocationRigs(locId){
  const loc=LOCATIONS[locId]; if(!loc) return [];
  return loc.rigSpots.map((_,i)=>defaultRig(locId,i));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOCATIONS, SHOP_ORDER, defaultRig, makeLocationRigs };
}
