/**
 * power.js — power, heat (BTU), and cost model (v0.2)
 *
 * Pure functions. No DOM. Each rig has a power setting (low/normal/high) that
 * sets per-GPU watts; total draw = GPUs*perGpuW + parasitic. From total watts we
 * derive BTU/hr (heat), kWh over time, and electricity cost. BBT<->USD lets us
 * compare mining revenue to the power bill.
 *
 * Room baseline: 72F / 25% humidity (fixed for now; weather-by-zip is backlogged).
 */

const POWER_SETTINGS = {
  low:    { perGpuW: 125, label: 'Low',    hashMult: 0.75 },
  normal: { perGpuW: 200, label: 'Normal', hashMult: 1.00 },
  high:   { perGpuW: 300, label: 'High',   hashMult: 1.18 },
};
const PARASITIC_W = 80;          // mobo/cpu/etc per rig
const ROOM_BASE_F = 72;
const ROOM_HUMIDITY = 25;
const WATT_TO_BTU = 3.412;       // BTU/hr per watt

const ECON_DEFAULTS = {
  costPerKwh: 0.08,              // $/kWh (settings menu)
  bbtUsd: 2.00,                  // starting BBT price in USD (drifts)
};

/** Total watts for a rig at its current setting. */
function rigWatts(rig) {
  const s = POWER_SETTINGS[rig.power || 'normal'];
  return rig.count * s.perGpuW + PARASITIC_W;
}

/** Hashrate scaled by power setting (higher power = higher hash). */
function rigPowerHash(rig, baseHashPerCard) {
  const s = POWER_SETTINGS[rig.power || 'normal'];
  return Math.round(baseHashPerCard * rig.count * s.hashMult);
}

/** BTU/hr produced by a wattage (all electrical power becomes heat). */
function wattsToBtu(watts) { return watts * WATT_TO_BTU; }

/** kWh consumed over a number of hours. */
function kwh(watts, hours) { return watts * hours / 1000; }

/** Electricity cost over hours. */
function powerCost(watts, hours, costPerKwh) { return kwh(watts, hours) * costPerKwh; }

/** Hash-per-watt efficiency (network H/s per watt). */
function efficiency(hashRate, watts) { return watts > 0 ? hashRate / watts : 0; }

/**
 * Simulate room temperature rise from heat load. Simple model: each 1000 BTU/hr
 * over baseline raises a small unventilated room a few degrees toward an
 * equilibrium. Purely illustrative until real thermal/airflow modeling.
 */
function roomTempF(totalBtu) {
  // crude: +1F per ~340 BTU/hr above zero, capped for sanity
  const rise = Math.min(40, totalBtu / 340);
  return Math.round((ROOM_BASE_F + rise) * 10) / 10;
}

/** Slight random-walk drift for BBT price (market feel). Pure given prev+seedUnit. */
function driftPrice(prev, unit) {
  // +/- up to ~1.5% per tick, mean-reverting gently toward 2.00
  const pct = (unit - 0.5) * 0.03;
  let next = prev * (1 + pct);
  next += (2.00 - next) * 0.02;          // gentle mean reversion
  return Math.max(0.05, Math.round(next * 100) / 100);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POWER_SETTINGS, PARASITIC_W, ROOM_BASE_F, ROOM_HUMIDITY, WATT_TO_BTU, ECON_DEFAULTS,
    rigWatts, rigPowerHash, wattsToBtu, kwh, powerCost, efficiency, roomTempF, driftPrice,
  };
}
