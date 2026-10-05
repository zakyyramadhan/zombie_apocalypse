// Pure game logic. No DOM, no Three.js. Testable with node.
import { WEAPONS, TOOLS, ZOMBIES, LOOT_TABLES, ENCOUNTER_WEIGHTS, MERCHANT_BASE, ITEMS, ITEM_ICON, STASH_LEVELS } from './data.js';

export const rng = {
  f: Math.random,
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
};

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function newPlayer() {
  return {
    hp: 100, maxHp: 100, san: 80, maxSan: 100, sta: 100, maxSta: 100,
    hunger: 80, maxHunger: 100, thirst: 70, maxThirst: 100,
    money: 50,
    weaponId: 'kitchen_knife', weaponBonus: { damage: 0, crit: 0, stamina: 0, maxDura: 0 },
    weaponDura: WEAPONS.kitchen_knife.durability,
    tools: {}, toolId: 'none', // owned tools + equipped tool (gather bonus, never fights)
    armorId: 'none', accessoryId: 'none',
    inv: { bandage: 1, canned_food: 2, water_bottle: 1, scrap: 2 },
    kills: 0, explored: 0, looted: 0, day: 1, minute: 8 * 60,
    noise: 0, locationId: null, depth: 0, rep: 0,
    quests: {}, flags: {},
    // base-building (start from nowhere)
    base: null, siteFound: false, baseStorage: 0, thirstSaver: false,
    lastGardenDay: 0, lastWaterDay: 0,
    searched: {}, deep: 0, // per-visit room depletion + push-deeper count
    gatherLeft: 3, gatherDay: 0, // nearby gathering charges, refilled daily
    gardenCrop: null, // { plantedDay } once seeds are in the ground
  };
}

export function weaponOf(p) {
  const base = WEAPONS[p.weaponId] || WEAPONS.kitchen_knife;
  return {
    ...base,
    damage: base.damage + (p.weaponBonus.damage || 0),
    crit: base.crit + (p.weaponBonus.crit || 0),
    stamina: Math.max(3, base.stamina + (p.weaponBonus.stamina || 0)),
    durability: base.durability + (p.weaponBonus.maxDura || 0),
  };
}

export function invCount(p) { return Object.values(p.inv).reduce((a, b) => a + b, 0); }
export function invCap(p) { return 12 + (p.accessoryId === 'backpack' ? 8 : 0) + (p.baseStorage || 0); }

// canonical item ids: display names / wrong case always resolve to the real id,
// so a save can never end up with unusable ghost entries like 'Canned Food'.
let _canon = null;
export function canonId(id) {
  if (!id) return id;
  if (ITEMS[id] || WEAPONS[id]) return id;
  if (!_canon) {
    _canon = {};
    for (const [key, def] of [...Object.entries(ITEMS), ...Object.entries(WEAPONS), ...Object.entries(TOOLS)]) {
      _canon[key.toLowerCase()] = key;
      if (def.name) _canon[def.name.toLowerCase().replace(/\s+/g, '_')] = key;
    }
  }
  return _canon[String(id).toLowerCase().replace(/\s+/g, '_')] || id;
}
export function normalizeInv(p) {
  if (!p.inv) { p.inv = {}; return 0; }
  let fixed = 0;
  const clean = {};
  for (const [id, qty] of Object.entries(p.inv)) {
    const cid = canonId(id);
    if (cid !== id) fixed++;
    clean[cid] = (clean[cid] || 0) + qty;
  }
  p.inv = clean;
  return fixed;
}

export function addItem(p, id, qty = 1) {
  id = canonId(id);
  if (invCount(p) + qty > invCap(p)) return false;
  p.inv[id] = (p.inv[id] || 0) + qty;
  return true;
}
export function removeItem(p, id, qty = 1) {
  id = canonId(id);
  if ((p.inv[id] || 0) < qty) return false;
  p.inv[id] -= qty;
  if (p.inv[id] <= 0) delete p.inv[id];
  return true;
}

// ---- time ----
export function fmtTime(p) {
  const h = String(Math.floor(p.minute / 60) % 24).padStart(2, '0');
  const m = String(p.minute % 60).padStart(2, '0');
  return `DAY ${p.day} — ${h}:${m}`;
}
export function isNight(p) { const h = (p.minute / 60) % 24; return h >= 20 || h < 6; }
export function advanceTime(p, mins) {
  p.minute += mins;
  while (p.minute >= 24 * 60) { p.minute -= 24 * 60; p.day += 1; }
  // hunger/thirst drain ~3 per hour
  const drain = (mins / 60) * 3;
  p.hunger = clamp(p.hunger - drain, 0, p.maxHunger);
  p.thirst = clamp(p.thirst - drain * 1.2 * (p.thirstSaver ? 0.75 : 1), 0, p.maxThirst);
  p.noise = clamp(p.noise - mins * 0.25, 0, 100);
  p.sta = clamp(p.sta + mins * 0.25, 0, p.maxSta);
  // starvation: drains that can actually kill (no floor at 1)
  const hrs = mins / 60;
  if (p.hunger <= 0) {
    p.hp = clamp(p.hp - hrs * 8, 0, p.maxHp);
    p.sta = clamp(p.sta - hrs * 10, 0, p.maxSta);
    p.san = clamp(p.san - hrs * 4, 0, p.maxSan);
  }
  if (p.thirst <= 0) {
    p.hp = clamp(p.hp - hrs * 10, 0, p.maxHp);
    p.sta = clamp(p.sta - hrs * 12, 0, p.maxSta);
    p.san = clamp(p.san - hrs * 6, 0, p.maxSan);
  }
}

// ---- weather ----
export function rollWeather() {
  const r = Math.random();
  if (r < 0.55) return 'clear';
  if (r < 0.72) return 'rain';
  if (r < 0.82) return 'fog';
  if (r < 0.90) return 'storm';
  return 'clear';
}
export const WEATHER_ICON = { clear: '☀️ Clear', rain: '🌧️ Rain', storm: '⛈️ Storm', fog: '🌫️ Fog' };

// ---- sanity ----
export function sanityTier(san) {
  if (san >= 80) return 'stable';
  if (san >= 50) return 'uneasy';
  if (san >= 20) return 'unstable';
  return 'critical';
}
export function sanityCombatPenalty(p) {
  const t = sanityTier(p.san);
  if (t === 'unstable') return 0.90;
  if (t === 'critical') return 0.75;
  return 1.0;
}
export function maybePanic(p) {
  const t = sanityTier(p.san);
  if (t === 'critical' && rng.chance(0.15)) return true;
  if (t === 'unstable' && rng.chance(0.05)) return true;
  return false;
}

// ---- encounters (weighted, context-aware per AGENT.md §38) ----
export function encounterRoll(p, loc, dangerMod = 0, weather = 'clear') {
  const w = { ...ENCOUNTER_WEIGHTS };
  const danger = loc.danger + dangerMod;
  w.combat += danger * 4 + p.noise * 0.25 + (isNight(p) ? 12 : 0);
  if (weather === 'fog') w.combat -= 6;
  if (weather === 'storm') w.environmental += 8;
  // wildlife: forests & farms teem; factories echo empty; animals hide at night
  w.animal = (w.animal ?? 12);
  if (loc.id === 'forest' || loc.id === 'farm') w.animal += 8;
  if (loc.id === 'factory') w.animal -= 8;
  if (isNight(p)) w.animal -= 8;
  if (p.san < 50) w.nothing -= 4;
  if (p.accessoryId === 'flashlight' && isNight(p)) w.loot += 5;
  // normalize
  const total = Object.values(w).reduce((a, b) => a + Math.max(0, b), 0);
  let r = Math.random() * total;
  for (const k of Object.keys(w)) {
    r -= Math.max(0, w[k]);
    if (r <= 0) {
      if (k === 'nothing' && p.san < 50 && rng.chance(0.35)) return 'hallucination';
      return k;
    }
  }
  return 'loot';
}

export function rollLoot(tableId) {
  const table = LOOT_TABLES[tableId] || LOOT_TABLES.general;
  const out = [rng.pick(table)];
  if (rng.chance(0.35)) out.push(rng.pick(table));
  if (rng.chance(0.06)) out.push('battery'); // rare stays rare
  return out;
}

// ---- combat math (pure, returns events) ----
export function playerAttack(p, zombie, action) {
  const w = weaponOf(p);
  const broken = p.weaponDura <= 0;
  let dmgMul = 1, staCost = w.stamina, critMul = 1, noiseAdd = w.noise, accMul = 1;
  if (action === 'heavy') { dmgMul = 1.7; staCost *= 1.8; noiseAdd += 12; }
  if (action === 'head') { dmgMul = 1.2; critMul = 3; accMul = 0.85; staCost *= 1.3; noiseAdd += 5; }
  if (p.hunger <= 0) accMul *= 0.85; // starving hands shake
  if (p.thirst <= 0) accMul *= 0.8; // parched eyes blur
  staCost *= (p.thirst < 25 ? 1.3 : 1);
  if (p.sta < staCost) return { ok: false, reason: 'Not enough stamina.' };
  p.sta = clamp(p.sta - staCost, 0, p.maxSta);
  p.weaponDura = Math.max(0, p.weaponDura - (action === 'heavy' ? 2 : 1));
  p.noise = clamp(p.noise + noiseAdd, 0, 100);

  let critC = w.crit * critMul;
  if (broken) critC *= 0.5;
  const hitChance = 0.92 * accMul * sanityCombatPenalty(p);
  if (!rng.chance(hitChance)) return { ok: true, miss: true, staCost, noiseAdd };
  const isCrit = rng.chance(clamp(critC, 0.02, 0.6));
  let dmg = w.damage * dmgMul * (broken ? 0.5 : 1);
  if (p.weaponDura < w.durability * 0.25) dmg *= 0.8;
  dmg *= (isCrit ? 2 : 1) * (0.85 + Math.random() * 0.3);
  dmg = Math.max(1, Math.round(dmg));
  // armor penetration vs nothing in MVP (future armored zombies) — crowbar bonus flavor
  const stunned = rng.chance(w.stun + (action === 'heavy' ? 0.15 : 0));
  return { ok: true, dmg, crit: isCrit, stunned, staCost, noiseAdd };
}

export function zombieAttack(p, zombie, playerGuard) {
  // playerGuard: 'dodge' | 'block' | null
  const armorDef = { none: 0, cloth_jacket: 2, leather_jacket: 5, police_vest: 8 }[p.armorId] ?? 0;
  let dmg = zombie.damage * (0.85 + Math.random() * 0.3);
  if (p.hunger < 25) dmg *= 1.1;
  if (playerGuard === 'dodge') {
    const cost = 10;
    if (p.sta >= cost) { p.sta -= cost; if (rng.chance(0.65)) return { dodged: true, dmg: 0 }; }
    dmg *= 0.5;
  }
  if (playerGuard === 'block') {
    const cost = 6;
    if (p.sta >= cost) p.sta -= cost;
    dmg *= 0.5;
  }
  dmg = Math.max(1, Math.round(dmg - armorDef * 0.6));
  p.hp = clamp(p.hp - dmg, 0, p.maxHp);
  if (zombie.sanityHit) p.san = clamp(p.san - 2, 0, p.maxSan);
  return { dmg };
}

export function fleeChance(p, zombies, bonus = 0) {
  const fastest = Math.max(...zombies.map(z => ZOMBIES[z.id]?.speed ?? 2));
  let c = 0.65 + (p.sta / p.maxSta) * 0.2 - fastest * 0.05 - (isNight(p) ? 0.1 : 0) + (bonus || 0);
  return clamp(c, 0.1, 0.95);
}

// ---- base building ----
export function newBase(siteId) {
  return { site: siteId, structures: [], foundedDay: null, stash: {}, stashLv: 1 };
}
export function stashCap(p) {
  const lv = Math.min(Math.max(p.base?.stashLv || 1, 1), STASH_LEVELS.length);
  return STASH_LEVELS[lv - 1].cap;
}
export function hasStruct(p, id) { return !!(p.base && p.base.structures.includes(id)); }
export function baseLevel(p) { return p.base ? p.base.structures.length : 0; }
export function canAfford(p, cost) {
  return Object.entries(cost).every(([id, qty]) => (p.inv[id] || 0) >= qty);
}
export function payCost(p, cost) {
  if (!canAfford(p, cost)) return false;
  for (const [id, qty] of Object.entries(cost)) removeItem(p, id, qty);
  return true;
}
export function costText(cost, icons) {
  return Object.entries(cost).map(([id, qty]) => `${(icons && icons[id]) || ''}${qty} ${id}`).join(' · ');
}
// icons + names for hover tooltips (may-yield previews)
export function tableIcons(tableId) {
  const table = LOOT_TABLES[tableId] || [];
  const seen = new Set(); const out = [];
  for (const id of table) {
    if (seen.has(id)) continue; seen.add(id);
    const it = ITEMS[id];
    out.push({ icon: ITEM_ICON[id] || '•', name: it ? it.name : id });
  }
  return out;
}

// equipped tool (belt slot — boosts gathering, never fights)
export function toolOf(p) {
  return TOOLS[p.toolId] || { id: 'none', name: '—', icon: '', gather: null, desc: '' };
}

// ---- merchant stock (dynamic per day) ----
export function merchantStock(day) {
  let seed = day * 7919;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return MERCHANT_BASE.map(s => {
    const base = ITEMS[s.id];
    const qty = Math.max(0, s.qty + Math.floor(rnd() * 3) - 1 - (day > 5 ? 1 : 0));
    const price = Math.round(base.price * (0.9 + rnd() * 0.4));
    return { ...s, price, qty };
  }).filter(s => s.qty > 0);
}

// ---- score (deeds, not levels) ----
export function survivalScore(p) {
  return p.kills * 40 + p.explored * 60 + p.looted * 10 + (p.day - 1) * 120 + Math.max(0, p.rep) * 5;
}
