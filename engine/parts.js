/**
 * parts.js - parts store catalog + rig validity rules (v0.5)
 *
 * Parts are individual objects bought into a per-slot "Parts Owned" inventory,
 * then assigned to rigs. A rig is only a valid (mining) RIG when it has all
 * required parts; otherwise it's an incomplete build.
 *
 * GPU hash/power are RANGES mapped to the power setting:
 *   low=min hash/min watts (efficient), normal=mid, high=max/max.
 * Hashrates are MH/s, assumed identical for the BBT network (per Carter).
 *
 * Case AND motherboard both come in 6/8/12/19 sizes and MUST MATCH. The slot
 * size caps how many GPUs the rig can hold (2..size).
 *
 * Prices are STARTER values in BBT - override via the pricing CSV.
 */

const GPU_PARTS = [{"id":"gtx_1060_6gb","vendor":"NVIDIA","name":"GTX 1060 6GB","hash":{"low":22.0,"normal":23.5,"high":25.0},"watts":{"low":80,"normal":85,"high":90},"price":38},{"id":"gtx_1070","vendor":"NVIDIA","name":"GTX 1070","hash":{"low":27.0,"normal":29.5,"high":32.0},"watts":{"low":110,"normal":118,"high":125},"price":47},{"id":"gtx_1070_ti","vendor":"NVIDIA","name":"GTX 1070 Ti","hash":{"low":30.0,"normal":31.5,"high":33.0},"watts":{"low":120,"normal":130,"high":140},"price":50},{"id":"gtx_1080","vendor":"NVIDIA","name":"GTX 1080","hash":{"low":34.0,"normal":36.0,"high":38.0},"watts":{"low":150,"normal":165,"high":180},"price":58},{"id":"gtx_1080_ti","vendor":"NVIDIA","name":"GTX 1080 Ti","hash":{"low":44.0,"normal":47.0,"high":50.0},"watts":{"low":180,"normal":200,"high":220},"price":75},{"id":"gtx_1660","vendor":"NVIDIA","name":"GTX 1660","hash":{"low":20.0,"normal":22.0,"high":24.0},"watts":{"low":70,"normal":75,"high":80},"price":35},{"id":"gtx_1660_super","vendor":"NVIDIA","name":"GTX 1660 Super","hash":{"low":31.0,"normal":32.5,"high":34.0},"watts":{"low":70,"normal":75,"high":80},"price":52},{"id":"gtx_1660_ti","vendor":"NVIDIA","name":"GTX 1660 Ti","hash":{"low":30.0,"normal":31.0,"high":32.0},"watts":{"low":70,"normal":75,"high":80},"price":50},{"id":"rtx_2060","vendor":"NVIDIA","name":"RTX 2060","hash":{"low":31.0,"normal":32.5,"high":34.0},"watts":{"low":80,"normal":88,"high":95},"price":52},{"id":"rtx_2060_super","vendor":"NVIDIA","name":"RTX 2060 Super","hash":{"low":40.0,"normal":42.0,"high":44.0},"watts":{"low":120,"normal":128,"high":135},"price":67},{"id":"rtx_2070","vendor":"NVIDIA","name":"RTX 2070","hash":{"low":40.0,"normal":42.0,"high":44.0},"watts":{"low":115,"normal":122,"high":130},"price":67},{"id":"rtx_2070_super","vendor":"NVIDIA","name":"RTX 2070 Super","hash":{"low":42.0,"normal":43.5,"high":45.0},"watts":{"low":120,"normal":128,"high":135},"price":70},{"id":"rtx_2080","vendor":"NVIDIA","name":"RTX 2080","hash":{"low":42.0,"normal":43.5,"high":45.0},"watts":{"low":125,"normal":135,"high":145},"price":70},{"id":"rtx_2080_ti","vendor":"NVIDIA","name":"RTX 2080 Ti","hash":{"low":58.0,"normal":60.0,"high":62.0},"watts":{"low":170,"normal":190,"high":210},"price":96},{"id":"rtx_3060","vendor":"NVIDIA","name":"RTX 3060","hash":{"low":47.0,"normal":48.5,"high":50.0},"watts":{"low":105,"normal":112,"high":120},"price":78},{"id":"rtx_3060_ti","vendor":"NVIDIA","name":"RTX 3060 Ti","hash":{"low":58.0,"normal":60.0,"high":62.0},"watts":{"low":115,"normal":122,"high":130},"price":96},{"id":"rtx_3070","vendor":"NVIDIA","name":"RTX 3070","hash":{"low":60.0,"normal":61.5,"high":63.0},"watts":{"low":115,"normal":122,"high":130},"price":98},{"id":"rtx_3070_ti","vendor":"NVIDIA","name":"RTX 3070 Ti","hash":{"low":78.0,"normal":80.0,"high":82.0},"watts":{"low":180,"normal":190,"high":200},"price":128},{"id":"rtx_3080_10gb","vendor":"NVIDIA","name":"RTX 3080 10GB","hash":{"low":95.0,"normal":98.5,"high":102.0},"watts":{"low":220,"normal":235,"high":250},"price":158},{"id":"rtx_3080_12gb","vendor":"NVIDIA","name":"RTX 3080 12GB","hash":{"low":98.0,"normal":101.5,"high":105.0},"watts":{"low":230,"normal":245,"high":260},"price":162},{"id":"rtx_3080_ti","vendor":"NVIDIA","name":"RTX 3080 Ti","hash":{"low":112.0,"normal":117.0,"high":122.0},"watts":{"low":260,"normal":280,"high":300},"price":187},{"id":"rtx_3090","vendor":"NVIDIA","name":"RTX 3090","hash":{"low":118.0,"normal":121.5,"high":125.0},"watts":{"low":285,"normal":302,"high":320},"price":194},{"id":"rtx_3090_ti","vendor":"NVIDIA","name":"RTX 3090 Ti","hash":{"low":125.0,"normal":128.5,"high":132.0},"watts":{"low":300,"normal":320,"high":340},"price":206},{"id":"rtx_4060_ti","vendor":"NVIDIA","name":"RTX 4060 Ti","hash":{"low":44.0,"normal":46.0,"high":48.0},"watts":{"low":95,"normal":105,"high":115},"price":74},{"id":"rtx_4070","vendor":"NVIDIA","name":"RTX 4070","hash":{"low":58.0,"normal":60.5,"high":63.0},"watts":{"low":110,"normal":122,"high":135},"price":97},{"id":"rtx_4070_ti","vendor":"NVIDIA","name":"RTX 4070 Ti","hash":{"low":78.0,"normal":81.5,"high":85.0},"watts":{"low":170,"normal":190,"high":210},"price":130},{"id":"rtx_4080","vendor":"NVIDIA","name":"RTX 4080","hash":{"low":95.0,"normal":100.0,"high":105.0},"watts":{"low":220,"normal":240,"high":260},"price":160},{"id":"rtx_4090","vendor":"NVIDIA","name":"RTX 4090","hash":{"low":120.0,"normal":127.5,"high":135.0},"watts":{"low":300,"normal":330,"high":360},"price":204},{"id":"rx_470_4_8gb","vendor":"AMD","name":"RX 470 4/8GB","hash":{"low":27.0,"normal":28.5,"high":30.0},"watts":{"low":85,"normal":92,"high":100},"price":46},{"id":"rx_480_8gb","vendor":"AMD","name":"RX 480 8GB","hash":{"low":29.0,"normal":30.5,"high":32.0},"watts":{"low":90,"normal":100,"high":110},"price":49},{"id":"rx_570_4_8gb","vendor":"AMD","name":"RX 570 4/8GB","hash":{"low":28.0,"normal":29.5,"high":31.0},"watts":{"low":85,"normal":92,"high":100},"price":47},{"id":"rx_580_8gb","vendor":"AMD","name":"RX 580 8GB","hash":{"low":30.0,"normal":31.5,"high":33.0},"watts":{"low":85,"normal":92,"high":100},"price":50},{"id":"rx_590","vendor":"AMD","name":"RX 590","hash":{"low":31.0,"normal":32.5,"high":34.0},"watts":{"low":100,"normal":110,"high":120},"price":52},{"id":"vega_56","vendor":"AMD","name":"Vega 56","hash":{"low":45.0,"normal":47.5,"high":50.0},"watts":{"low":130,"normal":145,"high":160},"price":76},{"id":"vega_64","vendor":"AMD","name":"Vega 64","hash":{"low":47.0,"normal":49.5,"high":52.0},"watts":{"low":150,"normal":165,"high":180},"price":79},{"id":"rx_5600_xt","vendor":"AMD","name":"RX 5600 XT","hash":{"low":40.0,"normal":41.5,"high":43.0},"watts":{"low":95,"normal":102,"high":110},"price":66},{"id":"rx_5700","vendor":"AMD","name":"RX 5700","hash":{"low":50.0,"normal":52.0,"high":54.0},"watts":{"low":105,"normal":115,"high":125},"price":83},{"id":"rx_5700_xt","vendor":"AMD","name":"RX 5700 XT","hash":{"low":52.0,"normal":54.5,"high":57.0},"watts":{"low":110,"normal":120,"high":130},"price":87},{"id":"rx_6600","vendor":"AMD","name":"RX 6600","hash":{"low":28.0,"normal":29.0,"high":30.0},"watts":{"low":50,"normal":55,"high":60},"price":46},{"id":"rx_6600_xt","vendor":"AMD","name":"RX 6600 XT","hash":{"low":32.0,"normal":33.0,"high":34.0},"watts":{"low":55,"normal":60,"high":65},"price":53},{"id":"rx_6700_xt","vendor":"AMD","name":"RX 6700 XT","hash":{"low":46.0,"normal":47.0,"high":48.0},"watts":{"low":105,"normal":115,"high":125},"price":75},{"id":"rx_6800","vendor":"AMD","name":"RX 6800","hash":{"low":62.0,"normal":63.0,"high":64.0},"watts":{"low":135,"normal":145,"high":155},"price":101},{"id":"rx_6800_xt","vendor":"AMD","name":"RX 6800 XT","hash":{"low":63.0,"normal":64.0,"high":65.0},"watts":{"low":145,"normal":155,"high":165},"price":102},{"id":"rx_6900_xt","vendor":"AMD","name":"RX 6900 XT","hash":{"low":63.0,"normal":64.5,"high":66.0},"watts":{"low":150,"normal":162,"high":175},"price":103},{"id":"rx_7600","vendor":"AMD","name":"RX 7600","hash":{"low":30.0,"normal":31.5,"high":33.0},"watts":{"low":70,"normal":78,"high":85},"price":50},{"id":"rx_7700_xt","vendor":"AMD","name":"RX 7700 XT","hash":{"low":38.0,"normal":40.0,"high":42.0},"watts":{"low":120,"normal":135,"high":150},"price":64},{"id":"rx_7800_xt","vendor":"AMD","name":"RX 7800 XT","hash":{"low":48.0,"normal":50.0,"high":52.0},"watts":{"low":150,"normal":165,"high":180},"price":80},{"id":"rx_7900_xt","vendor":"AMD","name":"RX 7900 XT","hash":{"low":58.0,"normal":61.5,"high":65.0},"watts":{"low":220,"normal":240,"high":260},"price":98},{"id":"rx_7900_xtx","vendor":"AMD","name":"RX 7900 XTX","hash":{"low":60.0,"normal":65.0,"high":70.0},"watts":{"low":240,"normal":270,"high":300},"price":104}];
const CASES        = [{"id":"case_6","name":"6-Card Open-Air Frame","slots":6,"price":35},{"id":"case_8","name":"8-Card Open-Air Frame","slots":8,"price":45},{"id":"case_12","name":"12-Card Open-Air Frame","slots":12,"price":65},{"id":"case_19","name":"19-Card Mining Rack","slots":19,"price":95}];
const MOTHERBOARDS  = [{"id":"mb_6slot","name":"Biostar TB250-BTC (6 GPU)","slots":6,"price":45},{"id":"mb_8slot","name":"Biostar TB360-BTC D+ (8 GPU)","slots":8,"price":70},{"id":"mb_12slot","name":"Biostar TB360-BTC Pro (12 GPU)","slots":12,"price":110},{"id":"mb_19slot","name":"ASUS B250 Mining Expert (19 GPU)","slots":19,"price":200}];
const CPUS   = [{"id":"cpu_celeron","name":"Intel Celeron G4900","price":30},{"id":"cpu_pentium","name":"Intel Pentium G4400","price":45},{"id":"cpu_i3","name":"Intel Core i3-8100","price":75},{"id":"cpu_i5","name":"Intel Core i5-9400","price":110}];
const MEMORY = [{"id":"ram_4gb","name":"4GB DDR4 2400","price":18},{"id":"ram_8gb","name":"8GB DDR4 2666","price":28},{"id":"ram_16gb","name":"16GB DDR4 3200","price":45}];
const SSDS   = [{"id":"ssd_120","name":"120GB SATA SSD","price":22},{"id":"ssd_240","name":"240GB SATA SSD","price":32},{"id":"ssd_500","name":"500GB NVMe SSD","price":50}];
const USBS   = [{"id":"usb_16","name":"16GB USB 3.0 (boot)","price":8},{"id":"usb_32","name":"32GB USB 3.0 (boot)","price":12},{"id":"usb_hdd","name":"USB SSD 128GB (HiveOS)","price":30}];
const RISERS = [{"id":"riser_single","name":"PCIe USB Riser (1x)","price":6},{"id":"riser_6pack","name":"PCIe USB Riser (6-pack)","price":30},{"id":"riser_pro","name":"Premium Riser w/ caps (6)","price":48}];
const FANS   = [{"id":"fan_120","name":"120mm Case Fan","price":8},{"id":"fan_140","name":"140mm High-RPM Fan","price":12},{"id":"fan_bar5","name":"5-Fan Bar (1500 RPM)","price":43}];
const PSUS   = [{"id":"psu_750","name":"750W 80+ Gold PSU","watts":750,"price":90},{"id":"psu_1200","name":"1200W 80+ Platinum","watts":1200,"price":160},{"id":"psu_1600","name":"1600W 80+ Titanium","watts":1600,"price":230},{"id":"psu_2000","name":"2000W Server PSU","watts":2000,"price":140}];

const STORE_SECTIONS = [
  { key:'gpus',         label:'GPUs',           icon:'\u{1F5A5}', items:GPU_PARTS },
  { key:'cases',        label:'Cases / Frames', icon:'\u{1F5C4}', items:CASES },
  { key:'motherboards', label:'Motherboards',   icon:'\u{1F9E9}', items:MOTHERBOARDS },
  { key:'cpus',         label:'CPU',            icon:'\u{1F9E0}', items:CPUS },
  { key:'memory',       label:'Memory',         icon:'\u{1F4C7}', items:MEMORY },
  { key:'ssd',          label:'SSD',            icon:'\u{1F4BE}', items:SSDS },
  { key:'usb',          label:'USB Sticks',     icon:'\u{1F50C}', items:USBS },
  { key:'risers',       label:'GPU Risers',     icon:'\u{1F517}', items:RISERS },
  { key:'fans',         label:'Case Fans',      icon:'\u{1F4A8}', items:FANS },
  { key:'psus',         label:'Power Supplies', icon:'\u{1F50B}', items:PSUS },
];

const SALES_TAX = 0.05;
const RIG_SLOTS = ['case','motherboard','cpu','memory','storage','riser','psu'];
const MIN_GPUS = 2;

function partById(id){
  for(const s of STORE_SECTIONS){ const it=s.items.find(x=>x.id===id); if(it) return {...it,_section:s.key}; }
  return null;
}
function gpuStats(gpu, level){ return { mh:gpu.hash[level], watts:gpu.watts[level] }; }

function validateRig(build){
  const reasons=[];
  const c = build.case ? partById(build.case) : null;
  const mb = build.motherboard ? partById(build.motherboard) : null;
  if(!c) reasons.push('Needs a case/frame');
  if(!mb) reasons.push('Needs a motherboard');
  if(c && mb && c.slots!==mb.slots) reasons.push('Case ('+c.slots+') and motherboard ('+mb.slots+') sizes must match');
  if(!build.cpu) reasons.push('Needs a CPU');
  if(!build.memory) reasons.push('Needs memory');
  if(!build.storage) reasons.push('Needs an SSD or USB boot drive');
  if(!build.riser) reasons.push('Needs GPU risers');
  if(!build.psu) reasons.push('Needs a power supply');
  const gpus = build.gpus||[];
  if(gpus.length < MIN_GPUS) reasons.push('Needs at least '+MIN_GPUS+' GPUs');
  const slots = c ? c.slots : (mb ? mb.slots : 0);
  if(slots && gpus.length > slots) reasons.push('Too many GPUs ('+gpus.length+') for '+slots+'-card rig');
  return { valid: reasons.length===0, reasons, slots };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GPU_PARTS, CASES, MOTHERBOARDS, CPUS, MEMORY, SSDS, USBS, RISERS, FANS, PSUS,
    STORE_SECTIONS, SALES_TAX, RIG_SLOTS, MIN_GPUS, partById, gpuStats, validateRig };
}
