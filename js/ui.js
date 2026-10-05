// UI + game flow. Text is authoritative; Three.js is visualization.
import { WEAPONS, TOOLS, ARMORS, ACCESSORIES, ITEMS, ITEM_ICON, ZOMBIES, LOCATIONS, LOOT_TABLES, FORGE_CRAFTS, FIELD_RECIPES, STASH_LEVELS, CHURCH_ACTIONS, NPCS, STRUCTURES, BUILD_ORDER, SITES, RES_ICON, ANIMALS, ANIMAL_POOL, SELL_PRICES } from './data.js';
import { weaponOf, toolOf, tableIcons, invCount, invCap, stashCap, addItem, removeItem, normalizeInv, fmtTime, isNight, advanceTime, rollWeather, WEATHER_ICON, sanityTier, maybePanic, encounterRoll, rollLoot, stars, playerAttack, bleedTick, zombieAttack, fleeChance, merchantStock, survivalScore, sellPrice, marketMood, marketLabel, gearDef, gearSlot, ownsGear, grantGear, equipGear, clamp, hasStruct, baseLevel, canAfford, payCost, costText, newBase } from './systems.js';
import { ZScene } from './three-scene.js';

let S = null;          // { player, weather, merchantDay, world }
let screen = 'settlement';
let combat = null;     // { enemies:[{id,hp,max}], guard, log }
let exploreCtx = null; // { loc, room }
let useSave = null;    // injected from main.js
let invBack = null;    // where "back" goes from inventory (stay in inventory after use)
let wasHungry = false, wasThirsty = false; // edge flags for zero-meter warnings

export function bindState(state, saveHook) { S = state; useSave = saveHook; }
export function getState() { return S; }
const P = () => S.player;

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
function log(html, cls = '') {
  const el = $('log');
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.innerHTML = html;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
function clearLog() { $('log').innerHTML = ''; }
function setActions(list) {
  // list: [{label, fn, primary, danger, wide, disabled} | {header}]
  const box = $('actions');
  box.innerHTML = '';
  for (const a of list) {
    if (a.header) {
      const h = document.createElement('div');
      h.className = 'section-head';
      h.innerHTML = a.header;
      box.appendChild(h);
      continue;
    }
    const b = document.createElement('button');
    b.innerHTML = a.label;
    if (a.primary) b.className = 'primary';
    if (a.danger) b.classList.add('danger');
    if (a.wide) b.classList.add('wide');
    if (a.disabled) b.disabled = true;
    b.onclick = () => { try { a.fn && a.fn(); } catch (e) { console.error(e); } if (P().hp <= 0) checkDeath('Your body gave out.'); sync3D(); updateHUD(); };
    box.appendChild(b);
  }
}
function modal(html, buttons = [{ label: 'Close' }]) {
  $('modal-body').innerHTML = html;
  const ma = $('modal-actions');
  ma.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.innerHTML = b.label;
    btn.onclick = () => { $('modal').classList.add('hidden'); b.fn && b.fn(); updateHUD(); };
    ma.appendChild(btn);
  }
  $('modal').classList.remove('hidden');
}
export function itemName(id) {
  if (WEAPONS[id]) return WEAPONS[id].name;
  if (TOOLS[id]) return TOOLS[id].name;
  if (ITEMS[id]) return ITEMS[id].name;
  return id;
}
// may-yield icons with hover descriptions (desktop) — names stay visible nowhere else
function lootIcons(tableId) {
  return tableIcons(tableId).map(i => `<span title="${i.name}">${i.icon}</span>`).join('');
}
function updateHUD() {
  const p = P();
  const set = (id, v, max) => { $(id).style.width = clamp(v / max * 100, 0, 100) + '%'; };
  set('bar-hp', p.hp, p.maxHp); set('bar-san', p.san, p.maxSan); set('bar-sta', p.sta, p.maxSta);
  set('bar-hun', p.hunger, p.maxHunger); set('bar-thi', p.thirst, p.maxThirst);
  $('txt-hp').textContent = Math.round(p.hp); $('txt-san').textContent = Math.round(p.san);
  $('txt-sta').textContent = Math.round(p.sta); $('txt-hun').textContent = Math.round(p.hunger);
  $('txt-thi').textContent = Math.round(p.thirst);
  $('hud-time').textContent = `${fmtTime(p)} · ${WEATHER_ICON[S.weather] || S.weather}${isNight(p) ? ' · 🌙 NIGHT' : ''}`;
  $('hud-money').textContent = `💵 $${p.money}`;
  $('hud-noise').textContent = `🔊 Noise ${Math.round(p.noise)}`;
  $('hud-inv').textContent = `🎒 ${invCount(p)}/${invCap(p)}`;
  $('hud-loc').textContent = p.locationId ? `${LOCATIONS[p.locationId].icon} ${LOCATIONS[p.locationId].name}` : '⛺ Camp';
  const hb = $('hud-base');
  if (hb) hb.textContent = p.base ? `${SITES[p.base.site].icon} ${SITES[p.base.site].name} · Lv ${baseLevel(p)}` : '🌫️ No camp — scout!';
  // one-time crash warnings when a meter hits zero (flags reset on recovery)
  if (p.hunger <= 0 && !wasHungry) log(`<span class="bad">🍖 STARVING — cramps double you over. HP, stamina, sanity and aim are failing. Eat soon or die.</span>`);
  if (p.thirst <= 0 && !wasThirsty) log(`<span class="bad">💧 PARCHED — your throat is sandpaper. Drink soon or die.</span>`);
  wasHungry = p.hunger <= 0; wasThirsty = p.thirst <= 0;
}
function sync3D() {
  try {
    if (!window.ZScene) return;
    ZScene.setBase(P().base?.structures || []);
    ZScene.setDayTime((P().minute / 60) % 24);
    ZScene.setWeather(S.weather);
  } catch {}
}
function checkDeath(cause) {
  const p = P();
  if (p.hp <= 0) return die(cause || 'Your wounds were too great.');
  return false;
}
function die(cause) {
  if (screen === 'dead') return true; // idempotent: one death per run
  screen = 'dead';
  const p = P();
  const score = survivalScore(p);
  combat = null;
  updateBattleHUD();
  import('./state.js').then(m => {
    const meta = m.recordDeath(p, score);
    ZScene.badge('☠️ DEAD');
    clearLog();
    log(`══════════════════════════════<br><span class="title">☠️ YOU DIED</span><br>══════════════════════════════`);
    log(`${cause || 'The dead claimed you.'}`);
    log(`Day: <b>${p.day}</b> · Zombies killed: <b>${p.kills}</b> · Explored: <b>${p.explored}</b> · Looted: <b>${p.looted}</b><br>Final weapon: <b>${weaponOf(p).name}</b><br><span class="gold">Survival Score: ${score.toLocaleString()}</span>`);
    if (meta.bestScore) log(`<span class="sys">Best score: ${meta.bestScore.toLocaleString()} · Runs: ${meta.runs} · Total kills: ${meta.totalKills}</span>`);
    try { localStorage.removeItem('zombie_survival_save_v1'); } catch {}
    setActions([
      { label: '🆕 New Run', primary: true, wide: true, fn: () => window.location.reload() },
    ]);
  });
  return true;
}

// ---------- item use ----------
// Gear used to be shop-only, so "owned" was just `slot === id`. Found or forged
// gear keeps its own record (systems ownsGear/grantGear) and waits in the pack
// until you put it on.
function equipFromBag(id) {
  const p = P();
  if (!removeItem(p, id, 1)) return;
  grantGear(p, id);
  if (!equipGear(p, id)) { addItem(p, id, 1); log(`<span class="bad">You can't wear that.</span>`); return; }
  const d = gearDef(id);
  log(`✅ Equipped <b>${d.name}</b> from your pack. ${d.desc || ''}`, 'good');
  advanceTime(p, 5); useSave && useSave();
  showInventory(invBack, true);
}
function useItem(id) {
  const p = P();
  const it = ITEMS[id];
  if (!it || !(p.inv[id] > 0)) return;
  removeItem(p, id, 1);
  if (it.hp) p.hp = clamp(p.hp + it.hp, 0, p.maxHp);
  if (it.sta) p.sta = clamp(p.sta + it.sta, 0, p.maxSta);
  if (it.san) p.san = clamp(p.san + it.san, 0, p.maxSan);
  if (it.hunger) p.hunger = clamp(p.hunger + it.hunger, 0, p.maxHunger);
  if (it.thirst) p.thirst = clamp(p.thirst + it.thirst, 0, p.maxThirst);
  log(`Used <b>${it.name}</b>. ${it.desc}.`, 'good');
  if (id === 'raw_meat' && Math.random() < 0.25) {
    p.hp = clamp(p.hp - 8, 1, p.maxHp);
    log(`<span class="bad">That meat was off. Stomach cramps (−8 HP). Cook it at a campfire next time.</span>`);
  }
  advanceTime(p, 10);
  updateHUD(); sync3D();
  showInventory(invBack, true); // stay on inventory so you can use more
}

// ---------- CAMP ROUTER ----------
export function showCamp(first = false) {
  if (P().base) showSettlement(first);
  else showNowhere(first);
}
function goHome() { if (P().base) showSettlement(); else showNowhere(); }
function fleeBonus() { return hasStruct(P(), 'watchtower') ? 0.1 : 0; }

// ---------- NOWHERE (start with nothing — find it, build it) ----------
function showNowhere(first = false, silent = false) {
  screen = 'nowhere';
  const p = P();
  p.locationId = null;
  ZScene.setMode('settlement'); ZScene.setBase([]); ZScene.buildLocation('settlement'); ZScene.badge('🌫️ NOWHERE');
  if (first && !silent) {
    clearLog();
    log(`<span class="title">YOU WAKE UNDER A DEAD SKY</span><br>No camp. No walls. Just a cold stone circle where someone else's fire died long ago.<br><b>Find a place. Build it yourself.</b>`);
    log(`<span class="sys">Scout the area to claim a shelter site. Gather wood and stone with your hands if you must. Every comfort — merchant, forge, church, even safe sleep — must be BUILT from what you haul back.</span>`);
  } else if (!silent) {
    log(`<br><span class="sys">Open ground. No walls. You are exposed — build or keep moving.</span>`);
  }
  const gatherLeft = p.gatherDay !== p.day ? 3 : (p.gatherLeft ?? 3);
  setActions([
    { label: '🗺️ Scavenge afar', primary: true, fn: showMap },
    p.siteFound
      ? { label: '⛺ Claim a shelter site', primary: true, fn: chooseSite }
      : { label: '🔭 Scout for shelter site<br><small>40 min</small>', primary: true, fn: scoutSite },
    gatherLeft > 0
      ? { label: `🪵 Gather nearby<br><small>+1 wood · 20 min · ${gatherLeft} left</small>`, fn: gatherNearby }
      : { label: `🪵 Gather nearby<br><small>picked bare · tomorrow</small>`, disabled: true, fn: () => {} },
    { label: '🎒 Inventory', fn: () => showInventory(showNowhere) },
    { label: '📊 Survivor', fn: () => showCharacter(showNowhere) },
    { label: '🌙 Sleep rough<br><small>risky · poor rest</small>', fn: doSleep },
  ]);
  updateHUD(); sync3D();
}
function gatherNearby() {
  const p = P();
  if (p.gatherDay !== p.day) { p.gatherDay = p.day; p.gatherLeft = 3; }
  if ((p.gatherLeft ?? 3) <= 0) {
    log(`<span class="sys">Picked bare around here. Gathering shares <b>3 charges/day</b> across nearby & area nodes — back tomorrow.</span>`);
    updateHUD(); sync3D();
    return showNowhere(false, true);
  }
  advanceTime(p, 20);
  if (checkDeath('Starved while gathering scraps.')) return;
  p.gatherLeft -= 1;
  if (addItem(p, 'wood', 1)) log(`🪵 You drag back deadfall — a split plank, bark for kindling. <b>+1 Wood.</b> <span class="sys">(${p.gatherLeft} left today)</span>`, 'loot');
  else { p.gatherLeft += 1; log(`🎒 No room. The woods will keep.`, 'bad'); }
  useSave && useSave();
  updateHUD(); sync3D();
  showNowhere(false, true);
}
function scoutSite() {
  const p = P();
  advanceTime(p, 40);
  p.siteFound = true;
  log(`<br>🔭 From a ridge you spot three possibilities…`);
  useSave && useSave();
  updateHUD(); sync3D();
  chooseSite();
}
function chooseSite() {
  log(`<br><span class="title">⛺ CHOOSE YOUR GROUND</span> <span class="sys">— permanent. Each site feeds your future camp differently.</span>`);
  setActions([
    ...Object.entries(SITES).map(([id, s]) => ({
      label: `${s.icon} ${s.name}<br><small>${s.desc}</small>`, wide: true, primary: true,
      fn: () => foundBase(id),
    })),
    { label: '⬅ Not yet', wide: true, fn: () => showNowhere(false, true) },
  ]);
}
function foundBase(siteId) {
  const p = P();
  p.base = newBase(siteId);
  p.base.foundedDay = p.day;
  if (siteId === 'riverside') { p.thirstSaver = true; addItem(p, 'water_bottle', 2); }
  addItem(p, 'wood', 2); addItem(p, 'scrap', 1);
  const s = SITES[siteId];
  log(`<br><span class="title">${s.icon} ${s.name.toUpperCase()} CLAIMED — DAY ${p.day}</span><br>${s.desc}<br>You mark the ground with stones. An armful of branches, some scrap. <span class="good">+2 Wood, +1 Scrap${siteId === 'riverside' ? ', +2 Water' : ''}.</span><br><span class="sys">Now BUILD. First a campfire (4 wood), then a roof.</span>`);
  useSave && useSave();
  showSettlement(false, true);
}

// ---------- SETTLEMENT (built by you, structure by structure) ----------
function showSettlement(first = false, silent = false) {
  screen = 'settlement';
  const p = P();
  p.locationId = null;
  const site = SITES[p.base?.site];
  ZScene.setMode('settlement'); ZScene.setBase(p.base?.structures || []); ZScene.buildLocation('settlement');
  ZScene.badge(`${site?.icon || '⛺'} ${site ? site.name.toUpperCase() : 'SURVIVOR CAMP'} — LV ${baseLevel(p)}`);
  if (first && !silent) {
    clearLog();
    log(`<span class="title">╔══════════════════════════════╗<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SURVIVOR CAMP<br>╚══════════════════════════════╝</span>`);
    log(`Civilization collapsed weeks ago. This camp is all that's left.<br>You are the one who still goes <b>out there</b> — and comes back.`);
    log(`<span class="sys">Every decision has a consequence. Watch your sanity, noise, and the clock. Night is death. Return before dark.</span>`);
  } else if (!silent) {
    log(`<br><span class="title">${site?.icon || '⛺'} You return to ${site?.name || 'the camp'} (Lv ${baseLevel(p)}).</span> ${hasStruct(p, 'campfire') ? 'The fire crackles. ' : 'Cold ashes. No fire yet. '}You are safe — for now.`);
  }
  if (p.day !== S.merchantDay) { S.merchantDay = p.day; S.weather = rollWeather(); log(`<span class="sys">A new day. Merchant restocked. Weather: ${WEATHER_ICON[S.weather]}</span>`); }
  const locked = (need, label) => ({ label: `🔒 ${label}<br><small>build ${STRUCTURES[need].icon} ${STRUCTURES[need].name}</small>`, disabled: true, fn: () => {} });
  const acts = [
    { label: '🗺️ Explore', primary: true, fn: showMap },
    { label: `🔨 Build <span class="sys">Lv ${baseLevel(p)}</span>`, primary: !hasStruct(p, 'campfire'), fn: () => showBuild() },
    hasStruct(p, 'trading_post') ? { label: '🏪 Merchant', fn: showMerchant } : locked('trading_post', 'Merchant'),
    hasStruct(p, 'workshop') ? { label: '⚒️ Forge', fn: showForge } : locked('workshop', 'Forge'),
    hasStruct(p, 'shrine') ? { label: '⛪ Church', fn: showChurch } : locked('shrine', 'Church'),
    { label: '🛡️ Equipment', fn: showEquipment },
  ];
  if (hasStruct(p, 'supply_stash')) {
    const stored = Object.values(p.base.stash || {}).reduce((a, b) => a + b, 0);
    acts.push({ label: `🗃️ Stash <span class="sys">(${stored} stored)</span>`, fn: () => showStash(showSettlement) });
  }
  if (hasStruct(p, 'garden')) {
    const crop = p.gardenCrop;
    if (!crop) {
      acts.push((p.inv.seeds || 0) > 0
        ? { label: '🌱 Plant seeds<br><small>1 seeds · 15m</small>', fn: plantGarden }
        : { label: '🌱 Garden<br><small>needs seeds</small>', disabled: true, fn: () => {} });
    } else if (p.day > crop.plantedDay) {
      acts.push({ label: '🌱 Harvest garden<br><small>+3 food</small>', fn: harvestGarden });
    } else {
      acts.push({ label: '🌱 Sprouting…<br><small>ready tomorrow</small>', disabled: true, fn: () => {} });
    }
  }
  if (hasStruct(p, 'rain_collector')) {
    acts.push(p.lastWaterDay !== p.day
      ? { label: '🛢️ Collect water<br><small>+2 water</small>', fn: collectWater }
      : { label: '🛢️ Collector<br><small>empty today</small>', disabled: true, fn: () => {} });
  }
  if (hasStruct(p, 'campfire') && (p.inv.raw_meat || 0) > 0) {
    acts.push({ label: `🍖 Cook meat ×${p.inv.raw_meat}<br><small>raw → safe · 20m</small>`, fn: cookMeat });
  }
  acts.push(
    { label: '🎒 Inventory', fn: () => showInventory(showSettlement) },
    { label: '📊 Survivor', fn: () => showCharacter(showSettlement) },
    { label: hasStruct(p, 'lean_to') ? '😴 Sleep (+8h)' : '🌙 Sleep rough (+8h)', fn: doSleep },
  );
  setActions(acts);
  updateHUD(); sync3D();
}

// ---------- BUILD ----------
function showBuild(quiet = false) {
  screen = 'build';
  const p = P();
  if (!quiet) log(`<br><span class="title">🔨 BUILD — Camp Lv ${baseLevel(p)}</span> <span class="sys">Wood 🪵${p.inv.wood || 0} · Stone 🪨${p.inv.stone || 0} · Scrap ⚙️${p.inv.scrap || 0} · Metal 🔩${p.inv.metal || 0} · Cloth 🧵${p.inv.cloth || 0}</span>`);
  const acts = BUILD_ORDER.map(id => {
    const s = STRUCTURES[id];
    const built = hasStruct(p, id);
    const afford = canAfford(p, s.cost);
    return {
      label: `${built ? '✅' : s.icon} ${s.name} <span class="sys">${costText(s.cost, RES_ICON)}</span><br><small>${s.desc}</small>`,
      disabled: built || !afford,
      fn: () => buildStructure(id),
    };
  });
  acts.push({ label: '⬅ Camp', wide: true, fn: showSettlement });
  setActions(acts);
  updateHUD(); sync3D();
}
function buildStructure(id) {
  const p = P();
  const s = STRUCTURES[id];
  if (!payCost(p, s.cost)) { log(`Not enough materials.`, 'bad'); return showBuild(true); }
  p.base.structures.push(id);
  if (id === 'storage_shed') { p.baseStorage += 12; log(`<br>📦 <b>Storage Shed raised.</b> Backpack capacity <span class="good">+12</span>.`, 'good'); }
  else if (id === 'workshop') log(`<br>⚒️ <b>Workshop raised.</b> The <b>Forge</b> is open — upgrade and repair.`, 'good');
  else if (id === 'trading_post') log(`<br>🏪 <b>Trading Post raised.</b> A trader hangs her lantern. The <b>Merchant</b> is open.`, 'good');
  else if (id === 'shrine') log(`<br>⛪ <b>Shrine raised.</b> Someone left candles burning. The <b>Church</b> is open.`, 'good');
  else if (id === 'campfire') log(`<br>🔥 <b>Campfire lit.</b> Warmth, cooked food, and the first real rest in weeks.`, 'good');
  else if (id === 'supply_stash') log(`<br>🗃️ <b>Supply Stash buried.</b> Deposit and take items freely from camp.`, 'good');
  else if (id === 'lean_to') log(`<br>⛺ <b>Lean-to raised.</b> A roof. Full sleep from now on.`, 'good');
  else if (id === 'palisade') log(`<br>🛡️ <b>Palisade wall ringed.</b> Night raids and road ambushes mostly stop.`, 'good');
  else if (id === 'watchtower') log(`<br>🗼 <b>Watchtower raised.</b> You see them coming. <span class="good">+10% flee.</span>`, 'good');
  else if (id === 'garden') log(`<br>🌱 <b>Garden bed built.</b> Plant seeds, harvest 3 food the day after.`, 'good');
  else if (id === 'rain_collector') log(`<br>🛢️ <b>Rain collector rigged.</b> Collect 2 water every day.`, 'good');
  advanceTime(p, 60);
  p.rep += 1; // the camp notices who builds
  useSave && useSave();
  updateHUD(); sync3D();
  showBuild(true);
}
function plantGarden() {
  const p = P();
  if (!(p.inv.seeds > 0) || p.gardenCrop) return showSettlement(false, true);
  removeItem(p, 'seeds', 1);
  p.gardenCrop = { plantedDay: p.day };
  advanceTime(p, 15);
  if (checkDeath('Starved with hands in the dirt.')) return;
  log(`🌱 Seeds in the ground. Water them with hope. <span class="sys">Ready tomorrow.</span>`, 'good');
  useSave && useSave();
  updateHUD(); sync3D();
  showSettlement(false, true);
}
function harvestGarden() {
  const p = P();
  if (!p.gardenCrop || p.day <= p.gardenCrop.plantedDay) return showSettlement(false, true);
  p.gardenCrop = null; // bed is empty again — replant to grow more
  advanceTime(p, 20);
  if (checkDeath('Starved among ripe rows.')) return;
  let took = 0;
  for (let i = 0; i < 3; i++) { if (addItem(p, 'canned_food', 1)) took++; }
  if (took) log(`🌱 You harvest greens and roots. <b>+${took} food.</b> The bed is empty — plant again.`, 'loot');
  if (took < 3) log(`🎒 No room for the rest — it will keep.`, 'bad');
  useSave && useSave();
  updateHUD(); sync3D();
  showSettlement(false, true);
}
function collectWater() {
  const p = P();
  p.lastWaterDay = p.day;
  advanceTime(p, 15);
  addItem(p, 'water_bottle', 2) ? log(`🛢️ You drain the collector. <b>+2 water.</b>`, 'good') : log(`🛢️ Full backpack — the water will keep.`, 'bad');
  useSave && useSave();
  showSettlement(false, true);
}
function cookMeat() {
  const p = P();
  const n = p.inv.raw_meat || 0;
  if (!n) return showSettlement(false, true);
  advanceTime(p, 20);
  const space = invCap(p) - invCount(p) + n; // freed raw slots count
  const move = Math.min(n, space);
  removeItem(p, 'raw_meat', move);
  addItem(p, 'cooked_meat', move);
  log(`🍖 You cook ${move} meat over the fire. <b>+${move} Cooked Meat</b> — safe to eat.`, 'good');
  if (move < n) log(`<span class="sys">No room — ${n - move} raw left uncooked.</span>`);
  useSave && useSave();
  showSettlement(false, true);
}
function doSleep() {
  const p = P();
  const lean = hasStruct(p, 'lean_to');
  const fire = hasStruct(p, 'campfire');
  const safe = hasStruct(p, 'palisade');
  // Sleeping burns far less than walking: a roof cuts it further. Without this
  // an 8h sleep cost 24 hunger / 29 thirst and gave back only 15 HP — you woke
  // worse off than you lay down.
  advanceTime(p, 8 * 60, lean ? 0.4 : 0.6);
  if (lean) {
    p.hp = p.maxHp; p.san = clamp(p.san + 8, 0, p.maxSan); p.sta = p.maxSta;
    log(`😴 You sleep under your own roof. <span class="good">Fully healed, Sanity +8, Stamina full.</span> ${fmtTime(p)}.`);
  } else {
    p.hp = clamp(p.hp + 30, 0, p.maxHp); p.sta = p.maxSta;
    p.san = clamp(p.san + (fire ? 2 : -5), 0, p.maxSan);
    log(`🌙 You sleep on cold ground. <span class="good">HP +30.</span> ${fire ? `<span class="san">The fire watches over you. 🧠 +2.</span>` : `<span class="san">Stones dig into your back. 🧠 −5.</span>`}`);
  }
  // night raid — the price of no walls
  const raidC = safe ? 0.05 : (p.base ? 0.25 : 0.35);
  if (Math.random() < raidC) {
    const loss = [];
    for (const rid of ['canned_food', 'scrap', 'wood']) {
      if ((p.inv[rid] || 0) > 0 && loss.length < 2) { removeItem(p, rid, 1); loss.push(itemName(rid)); }
    }
    p.hp = clamp(p.hp - 5, 1, p.maxHp);
    log(`<span class="bad">🌙 NIGHT RAID — scratching, a crash, gone. Lost: ${loss.join(', ') || 'nothing but sleep'}. (−5 HP)</span>${safe ? '' : `<br><span class="sys">A palisade wall would stop this.</span>`}`);
  } else if (!safe && p.base) {
    log(`<span class="sys">Something circled the camp at night… and moved on.</span>`);
  }
  if (checkDeath('You never woke up. Hunger took you in your sleep.')) return;
  S.weather = rollWeather(); S.merchantDay = p.day;
  if (isNight(p)) log(`<span class="sys">You slept through the night. Wise.</span>`);
  useSave && useSave();
  showCamp();
}

// ---------- MERCHANT ----------
function showMerchant(mode = 'buy', quiet = false) {
  screen = 'merchant';
  const p = P();
  const stock = merchantStock(p.day);
  if (!quiet) log(`<br><span class="title">🏪 MERCHANT</span><br><span class="sys">"Supplies. Prices move with the days. And I buy goods too — meat, hides, parts."</span><br>Market: <b>${marketLabel(marketMood(p.day))}</b> · Your money: <b>$${p.money}</b>`);
  const acts = [
    { label: `🛒 Buy${mode === 'buy' ? ' ✅' : ''}`, fn: () => showMerchant('buy', true) },
    { label: `💰 Sell${mode === 'sell' ? ' ✅' : ''}`, fn: () => showMerchant('sell', true) },
  ];
  if (mode === 'buy') {
    acts.push(...stock.map(s => {
      const it = ITEMS[s.id];
      return {
        label: `${it.name} <span class="sys">$${s.price} ×${s.qty}</span><br><small>${it.desc}</small>`,
        disabled: p.money < s.price,
        fn: () => {
          if (p.money < s.price) return;
          if (!addItem(p, s.id, 1)) { log(`🎒 Backpack full! Sell or drop something first.`, 'bad'); showMerchant('buy', true); return; }
          p.money -= s.price;
          log(`Bought <b>${it.name}</b> for $${s.price}.`, 'good');
          advanceTime(p, 5);
          useSave && useSave();
          showMerchant('buy', true);
        }
      };
    }));
  } else {
    const sellable = Object.entries(SELL_PRICES).filter(([id]) => (p.inv[id] || 0) > 0);
    if (!sellable.length) acts.push({ label: `<span class="sys">Nothing to sell — bring wood, scrap, hides, meat.</span>`, disabled: true, fn: () => {} });
    for (const [id] of sellable) {
      const n = p.inv[id], price = sellPrice(id, p.day);
      const sellN = (qty) => () => {
        if (!removeItem(p, id, qty)) return;
        p.money += price * qty;
        advanceTime(p, 5 * qty); // time is the real cost of selling in bulk
        log(`Sold ${qty}× ${itemName(id)} <span class="good">+$${price * qty}</span> <span class="sys">(${5 * qty}m)</span>.`);
        useSave && useSave();
        showMerchant('sell', true);
      };
      acts.push({
        label: `${ITEM_ICON[id] || ''} Sell ${itemName(id)} ×1 <span class="sys">$${price}</span>`,
        fn: sellN(1),
      });
      if (n > 1) acts.push({
        label: `📦 Sell all ${n}× ${itemName(id)} <span class="sys">$${price * n} · ${5 * n}m</span>`,
        fn: sellN(n),
      });
    }
  }
  acts.push({ label: '⬅ Back', wide: true, fn: showSettlement });
  setActions(acts);
}

// ---------- FORGE ----------
function showForge() {
  screen = 'forge';
  const p = P();
  log(`<br><span class="title">⚒️ FORGE</span><br><span class="sys">Craft gear from what you haul home. There are <b>no weapon upgrades</b> — a blade is worn until it dies, then you forge another. The Forge tunes the <b>base</b> and the <b>stash</b> only.</span><br>Wood ${p.inv.wood || 0} · Scrap ${p.inv.scrap || 0} · Metal ${p.inv.metal || 0} · Cloth ${p.inv.cloth || 0} · Leather ${p.inv.leather || 0} · Battery ${p.inv.battery || 0}`);
  const acts = [];
  acts.push({ header: '🛠️ Forge Gear <span class="sys">— materials only, never money</span>' });
  for (const [id, c] of Object.entries(FORGE_CRAFTS)) {
    const d = gearDef(id);
    const owned = ownsGear(p, id);
    const equipped = p[gearSlot(id)] === id;
    acts.push({
      label: `${equipped ? '✅' : owned ? '🔧 owned' : '🛠️'} Forge ${d.name} <span class="sys">${owned ? 'see Equipment to wear it' : costText(c.cost, RES_ICON)}</span><br><small>${c.desc} · 40m</small>`,
      disabled: owned || !canAfford(p, c.cost),
      fn: () => {
        if (!payCost(p, c.cost)) { log(`Not enough materials.`, 'bad'); return showForge(); }
        grantGear(p, id);
        equipGear(p, id);
        log(`🛠️ Forged <b>${d.name}</b> from scrap and sweat. It's yours.`, 'good');
        advanceTime(p, 40);
        useSave && useSave();
        showForge();
      }
    });
  }
  // field dressings: consumable recipes from FIELD_RECIPES (workshop required)
  acts.push({ header: '🩹 Field Dressing <span class="sys">— cloth into care</span>' });
  for (const [id, r] of Object.entries(FIELD_RECIPES)) {
    const outName = ITEMS[r.out ? Object.keys(r.out)[0] : id]?.name || id;
    const outQty = r.out ? Object.values(r.out)[0] : 1;
    const afford = canAfford(p, r.cost);
    acts.push({
      label: `🩹 Make ${outName} <span class="sys">${costText(r.cost, RES_ICON)}</span><br><small>${r.desc} · ${r.mins}m</small>`,
      disabled: !afford,
      fn: () => {
        if (!payCost(p, r.cost)) { log(`Not enough materials.`, 'bad'); return showForge(); }
        for (const [oid, oqty] of Object.entries(r.out || { [id]: 1 })) addItem(p, oid, oqty);
        log(`🩹 Made <b>${outName} ×${outQty}</b>.`, 'good');
        advanceTime(p, r.mins || 15);
        useSave && useSave();
        showForge();
      }
    });
  }
  // stash capacity upgrades (needs the stash structure; forge needs workshop)
  if (hasStruct(p, 'supply_stash')) {
    acts.push({ header: `🗃️ Storage <span class="sys">— stash ${stashTotal(p)}/${stashCap(p)}</span>` });
    const lv = p.base.stashLv || 1;
    if (lv < STASH_LEVELS.length) {
      const next = STASH_LEVELS[lv]; // lv is 1-based, array is 0-based
      const mat = Object.fromEntries(Object.entries(next.cost).filter(([k]) => k !== 'money'));
      const afford = canAfford(p, mat) && p.money >= (next.cost.money || 0);
      acts.push({
        label: `🗃️ Enlarge Stash → ${next.cap}<br><small>${costText(mat, RES_ICON)}${next.cost.money ? ` · $${next.cost.money}` : ''} · 30m</small>`,
        disabled: !afford,
        fn: () => {
          if (!payCost(p, mat) || p.money < (next.cost.money || 0)) { log(`Not enough materials.`, 'bad'); return showForge(); }
          p.money -= (next.cost.money || 0);
          p.base.stashLv = lv + 1;
          log(`🗃️ <b>Stash enlarged — ${next.cap} slots.</b> Bury it deep.`, 'good');
          advanceTime(p, 30);
          useSave && useSave();
          showForge();
        }
      });
    } else {
      acts.push({ label: `🗃️ Stash maxed <span class="sys">${STASH_LEVELS[lv - 1].cap}</span>`, disabled: true, fn: () => {} });
    }
  }
  acts.push({ label: '⬅ Back', wide: true, fn: showSettlement });
  setActions(acts);
}

// ---------- CHURCH ----------
function showChurch() {
  screen = 'church';
  const p = P();
  const tier = sanityTier(p.san);
  const flavor = { stable: 'The priest smiles. "You hold together well."', uneasy: 'The priest looks at you. "You\'ve seen too much again."', unstable: 'Candles gutter as you enter. "Sit. Breathe. Tell me what followed you home."', critical: 'The priest grips your hands. They are shaking. "Stay with me. Name five things you can see."' }[tier];
  log(`<br><span class="title">⛪ CHURCH</span><br>${flavor}<br>Your Sanity: <b class="san">${Math.round(p.san)}</b> (${tier}) · HP ${Math.round(p.hp)} · Money $${p.money}`);
  setActions([
    { label: `🙏 Pray<br><small>+10 sanity · 30 min · free</small>`, fn: () => { p.san = clamp(p.san + 10, 0, p.maxSan); advanceTime(p, 30); log(`🙏 You pray. <span class="san">Sanity +10.</span>`, 'san'); useSave && useSave(); showChurch(); } },
    { label: `🕯️ Confess<br><small>+25 sanity · $20 · 45 min</small>`, disabled: p.money < 20, fn: () => { p.money -= 20; p.san = clamp(p.san + 25, 0, p.maxSan); advanceTime(p, 45); log(`🕯️ You confess. <span class="san">Sanity +25.</span>`, 'san'); useSave && useSave(); showChurch(); } },
    { label: `😴 Rest<br><small>+30 HP +10 san · 2h · drains food/water</small>`, fn: () => { p.hp = clamp(p.hp + 30, 0, p.maxHp); p.san = clamp(p.san + 10, 0, p.maxSan); p.sta = p.maxSta; advanceTime(p, 120); if (checkDeath('Your body gave out on the pew.')) return; log(`😴 You rest on a pew. <span class="good">HP +30, Sanity +10.</span> Time passes…`, 'good'); useSave && useSave(); showChurch(); } },
    { label: '⬅ Back', wide: true, fn: showSettlement },
  ]);
}

// ---------- EQUIPMENT ----------
function showEquipment(quiet = false) {
  screen = 'equipment';
  const p = P();
  const w = weaponOf(p);
  const t0 = toolOf(p);
  p.tools ??= {}; p.toolId ??= 'none';
  if (!quiet) log(`<br><span class="title">🛡️ EQUIPMENT</span><br>Weapon: <b>${w.name}</b> (DMG ${w.damage}) · Tool: <b>${t0.icon || ''} ${t0.name}</b>${t0.gather ? ` (+1 ${t0.gather})` : ''} · Armor: <b>${ARMORS[p.armorId].name}</b> (DEF ${ARMORS[p.armorId].def}) · Kit: <b>${(ACCESSORIES[p.accessoryId] || {}).name || '—'}</b><br>Money: <b>$${p.money}</b>`);
  setActions([
    { label: '⚔️ Weapons<br><small>blades & blunts</small>', fn: () => showEquipCat('weapons') },
    { label: '🔧 Belt Tools<br><small>gather bonus</small>', fn: () => showEquipCat('tools') },
    { label: '🦺 Armor<br><small>worn automatically</small>', fn: () => showEquipCat('armor') },
    { label: `🎒 Kit<br><small>one worn at a time</small>`, fn: () => showEquipCat('kit') },
    { label: '⬅ Back', wide: true, fn: showSettlement },
  ]);
  updateHUD(); sync3D();
}
function showEquipCat(cat, quiet = false) {
  screen = 'equipment';
  const p = P();
  // Money buys food. Every piece of gear here is forged at the workshop or
  // found in the world — this screen only decides what you are wearing.
  const IDS = {
    weapons: ['kitchen_knife', 'hunting_knife', 'baseball_bat', 'pipe', 'sledgehammer', 'crowbar', 'survival_sword'],
    tools: ['pickaxe', 'fire_axe'],
    armor: ['cloth_jacket', 'padded_coat', 'leather_jacket', 'police_vest', 'scrap_plate', 'riot_armor'],
    kit: ['flashlight', 'backpack', 'gas_mask'],
  };
  const titles = {
    weapons: '⚔️ WEAPONS <span class="sys">— forged or found, never bought</span>',
    tools: '🔧 BELT TOOLS <span class="sys">— owned gear switches free</span>',
    armor: '🦺 ARMOR <span class="sys">— hides and scrap, stitched at the forge</span>',
    kit: '🎒 KIT <span class="sys">— one worn at a time</span>',
  };
  if (!quiet) log(`<br><span class="title">${titles[cat] || '🛡️ EQUIPMENT'}</span>`);
  const acts = [];
  for (const id of IDS[cat] || []) {
    const d = gearDef(id);
    const owned = ownsGear(p, id);
    const equipped = p[gearSlot(id)] === id;
    const c = FORGE_CRAFTS[id];
    const where = c ? `forge: ${costText(c.cost, RES_ICON)}` : 'found in hard places only';
    const stat = cat === 'armor' ? `DEF ${d.def}`
      : cat === 'weapons' ? `DMG${d.damage} Crit${Math.round(d.crit * 100)}% Stun${Math.round((d.stun || 0) * 100)}% Sta${d.stamina}${d.trait ? ` · ${d.trait}` : ''}${d.canOpen ? ' · opens locks' : ''}`
        : d.desc;
    acts.push({
      label: `${equipped ? '✅' : owned ? '🔧' : '🔒'} ${d.name} <span class="sys">${owned ? (equipped ? 'equipped' : 'owned — tap to equip') : where}</span><br><small>${stat}</small>`,
      disabled: equipped || !owned,
      fn: () => {
        if (!equipGear(p, id)) return;
        log(`✅ Equipped <b>${d.name}</b>. ${d.desc || ''}`, 'good');
        advanceTime(p, 5); useSave && useSave(); showEquipCat(cat, true);
      },
    });
  }
  acts.push({ label: '⬅ Equipment', wide: true, fn: () => showEquipment(true) });
  setActions(acts);
  updateHUD(); sync3D();
}

// ---------- BASE STASH (deposit / take, capped, forge-upgraded) ----------
function stashTotal(p) {
  return Object.values((p.base && p.base.stash) || {}).reduce((a, b) => a + b, 0);
}
function showStash(back) {
  const p = P();
  if (!p.base) return goHome();
  p.base.stash ??= {};
  p.base.stashLv ??= 1;
  normalizeInv(p);
  const pack = Object.entries(p.inv);
  const stored = Object.entries(p.base.stash);
  const cap = stashCap(p);
  const maxed = (p.base.stashLv || 1) >= STASH_LEVELS.length;
  log(`<br><span class="title">🗃️ SUPPLY STASH</span> <span class="sys">— ${stashTotal(p)}/${cap} stored · pack ${invCount(p)}/${invCap(p)}${maxed ? '' : ' · bigger sizes at the Forge'}</span>`);
  const box = $('actions');
  box.innerHTML = '';
  const mkRow = (id, qty, verb, fn) => {
    const it = ITEMS[id] || {};
    const b = document.createElement('button');
    b.className = 'wide';
    b.innerHTML = `${ITEM_ICON[id] || '📦'} ${verb} ${it.name || id} ×${qty}`;
    b.title = it.desc || '';
    b.onclick = () => { try { fn(); } catch (e) { console.error(e); } updateHUD(); sync3D(); };
    box.appendChild(b);
  };
  const sectionHead = (txt) => {
    const h = document.createElement('div');
    h.className = 'section-head';
    h.innerHTML = txt;
    box.appendChild(h);
  };
  if (!pack.length && !stored.length) {
    log(`<span class="sys">Bare earth and empty hands. Go haul something.</span>`);
  }
  if (pack.length) sectionHead('📥 From pack — tap to stash it');
  for (const [id, qty] of pack) {
    mkRow(id, qty, 'Put', () => {
      const room = stashCap(p) - stashTotal(p);
      const move = Math.min(qty, Math.max(0, room));
      if (move <= 0) { log(`🗃️ Stash full (${stashCap(p)}). <b>Forge</b> a bigger one.`, 'bad'); return; }
      if (!removeItem(p, id, move)) return;
      p.base.stash[id] = (p.base.stash[id] || 0) + move;
      log(`Put <b>${ITEMS[id]?.name || id} ×${move}</b> in the stash${move < qty ? ' (rest stays in pack)' : ''}.`, 'good');
      useSave && useSave();
      showStash(back);
    });
  }
  if (stored.length) sectionHead('📤 From stash — tap to take it');
  for (const [id, qty] of stored) {
    mkRow(id, qty, 'Take', () => {
      const space = invCap(p) - invCount(p);
      const move = Math.min(qty, Math.max(0, space));
      if (move <= 0) { log(`🎒 Pack full — use or drop something first.`, 'bad'); return; }
      p.base.stash[id] -= move;
      if (p.base.stash[id] <= 0) delete p.base.stash[id];
      addItem(p, id, move);
      log(`Took <b>${ITEMS[id]?.name || id} ×${move}</b>${move < qty ? ' (rest stays buried)' : ''}.`, 'good');
      useSave && useSave();
      showStash(back);
    });
  }
  const backBtn = document.createElement('button');
  backBtn.className = 'wide';
  backBtn.textContent = '⬅ Back';
  backBtn.onclick = () => { try { (back || showSettlement)(); } catch (e) { console.error(e); } updateHUD(); sync3D(); };
  box.appendChild(backBtn);
}

// ---------- INVENTORY / CHARACTER ----------
function showInventory(back, quiet = false) {
  if (back) invBack = back;
  const p = P();
  normalizeInv(p); // display-name keys can never linger here
  const entries = Object.entries(p.inv);
  if (!quiet) log(`<br><span class="title">🎒 BACKPACK ${invCount(p)}/${invCap(p)}</span> <span class="sys">— tap a supply to use it</span>`);
  const box = $('actions');
  box.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'inv-grid';
  for (const [id, qty] of entries) {
    const gd = gearDef(id);                      // gear can sit in the bag now
    const it = ITEMS[id] || gd || {};
    const usable = it && ['heal', 'sanity', 'food', 'water'].includes(it.type);
    const isGear = !!gd;
    const b = document.createElement('button');
    b.className = 'inv-slot' + (usable || isGear ? ' usable' : '');
    b.innerHTML = `<span class="slot-drop" title="Discard">🗑</span><span class="slot-icon">${ITEM_ICON[id] || '📦'}</span><span class="slot-name">${it.name || id}</span><span class="slot-qty">×${qty}</span>`;
    b.title = (it.name || id) + (it.desc ? ' — ' + it.desc : '');
    b.onclick = (ev) => {
      try {
        if (ev.target.classList.contains('slot-drop')) return confirmDrop(id); // 🗑 corner = discard
        if (usable) useItem(id);
        else if (isGear) equipFromBag(id);
        else log(`<span class="sys">${it.name || id}: ${it.desc || 'crafting material. Forge and NPCs want these.'}</span>`);
      } catch (err) { console.error(err); }
      updateHUD(); sync3D();
    };
    grid.appendChild(b);
  }
  const empty = Math.max(0, invCap(p) - invCount(p));
  for (let i = 0; i < empty; i++) {
    const d = document.createElement('div');
    d.className = 'inv-slot empty';
    d.textContent = '·';
    grid.appendChild(d);
  }
  box.appendChild(grid);
  const backBtn = document.createElement('button');
  backBtn.className = 'wide';
  backBtn.textContent = '⬅ Back';
  backBtn.onclick = () => { try { (invBack || showSettlement)(); } catch (e) { console.error(e); } updateHUD(); sync3D(); };
  box.appendChild(backBtn);
}
// Discard, from the pack. Only thing in the bag is ever loose stock — gear
// leaves the bag the moment it is worn (see equipFromBag), so there is nothing
// to unequip here; the grid can only ever hold what you are not wearing.
function confirmDrop(id) {
  const p = P();
  const qty = p.inv[id] || 0;
  const name = itemName(id);
  if (qty <= 0) return showInventory(invBack, true);
  log(`<br><span class="title">🗑️ DISCARD — ${name}</span> <span class="sys">×${qty} in pack</span>`);
  const finish = () => { updateHUD(); sync3D(); useSave && useSave(); showInventory(invBack, true); };
  setActions([
    { label: `🗑️ Drop 1× ${name}<br><small>leaves ${qty - 1}</small>`, danger: true, fn: () => {
      removeItem(p, id, 1); log(`🗑️ Dropped <b>${name}</b> ×1.`, 'bad'); finish();
    } },
    { label: `🗑️ Drop ALL ${name} ×${qty}<br><small>leaves the pack empty of them</small>`, disabled: qty < 2, danger: true, fn: () => {
      removeItem(p, id, qty); log(`🗑️ Dropped <b>${name}</b> ×${qty}.`, 'bad'); finish();
    } },
    { label: '⬅ Cancel', wide: true, fn: () => showInventory(invBack, true) },
  ]);
}
function showCharacter(back) {
  const p = P();
  const w = weaponOf(p);
  log(`<br><span class="title">📊 SURVIVOR RECORD</span><br>Days outlived: <b>${p.day}</b> · Kills: <b>${p.kills}</b> · Places searched: <b>${p.explored}</b> · Hauls: <b>${p.looted}</b> · Standing: <b>${p.rep}</b><br>Weapon: <b>${w.name}</b> (DMG ${w.damage}) · Tool: <b>${toolOf(p).icon || ''} ${toolOf(p).name}</b> · Armor: <b>${ARMORS[p.armorId].name}</b> · Kit: <b>${(ACCESSORIES[p.accessoryId] || {}).name || '—'}</b><br><span class="sys">No levels. No skill trees. You are what you carry and what you built.</span>`);
  setActions([{ label: '⬅ Back', wide: true, fn: back || showSettlement }]);
}

// union of a location's room-table icons (area may-yield line on the map)
function areaIcons(loc) {
  const seen = new Set(); const out = [];
  for (const r of loc.rooms || []) {
    const table = LOOT_TABLES[r.loot] || [];
    for (const id of table) {
      if (seen.has(id)) continue; seen.add(id);
      const it = ITEMS[id];
      out.push(`<span title="${it ? it.name : id}">${ITEM_ICON[id] || '•'}</span>`);
    }
  }
  return out.join('');
}

// ---------- MAP / JOURNEY ----------
function showMap() {
  screen = 'map';
  const p = P();
  ZScene.setMode('explore'); ZScene.badge('🗺️ CHOOSE DESTINATION');
  log(`<br><span class="title">🗺️ MAP</span> <span class="sys">— distance costs time + food/water. Nightfall is coming.</span>`);
  const acts = Object.values(LOCATIONS).map(loc => {
    const visits = S.world.depleted[loc.id] || 0;
    const horde = visits >= 3 ? ' · ⚠️ horde signs' : '';
    const cdDay = (S.world.cooldown && S.world.cooldown[loc.id]) || 0;
    if (cdDay >= p.day) {
      return {
        label: `♻️ ${loc.name}<br><small>restocking — back Day ${cdDay + 1}</small>`,
        disabled: true, fn: () => {},
      };
    }
    return {
      label: `${loc.icon} ${loc.name}<br><small>${stars(loc.danger)} <span class="sys">${loc.danger}/5 — harder, richer</span> · ${areaIcons(loc)} · Distance ${loc.distance}${horde}</small>`,
      fn: () => travelTo(loc.id)
    };
  });
  acts.push({ label: '⬅ Camp', wide: true, fn: () => goHome() });
  setActions(acts);
}
function travelTo(locId) {
  const p = P();
  const loc = LOCATIONS[locId];
  const mins = loc.distance * 30;
  advanceTime(p, mins);
  if (checkDeath('Collapsed on the road, empty and dry.')) return;
  p.noise = clamp(p.noise + 5, 0, 100);
  S.weather = Math.random() < 0.3 ? rollWeather() : S.weather;
  p.locationId = locId; p.depth = 0;
  p.searched = {}; p.deep = 0; // fresh visit: rooms refill, pushes reset
  S.world.depleted[locId] = (S.world.depleted[locId] || 0) + 1;
  S.world.cooldown[locId] = p.day; // no spamming the same area until tomorrow
  ZScene.buildLocation(locId); ZScene.badge(`${loc.icon} ${loc.name.toUpperCase()}`);
  log(`<br><span class="title">${loc.icon} ${loc.name.toUpperCase()}</span> <span class="sys">${stars(loc.danger)} ${loc.danger}/5</span><br>${loc.desc}<br><span class="sys">${fmtTime(p)} · ${WEATHER_ICON[S.weather]}${isNight(p) ? ' · 🌙 NIGHT — encounter +40%, escape −20%' : ''}</span>`);
  if (isNight(p)) log(`<span class="bad">🌙 Night. The dark between the buildings seems to breathe.</span>`);
  // road ambush 20%
  if (Math.random() < 0.2) {
    log(`<span class="bad">Something followed you from the road…</span>`);
    startCombat(pickEnemies(loc, 1));
    return;
  }
  showExplore(locId);
}
// spread the data entry so new flags (noStun, scream, …) reach combat for free —
// the old hand-copied field list silently dropped any field added to ZOMBIES
function mkZombie(id) {
  const z = ZOMBIES[id] || ZOMBIES.walker;
  const hp = z.hp + Math.floor(Math.random() * 8);
  return { ...z, hp, max: hp };
}
function pickEnemies(loc, n) {
  const out = [];
  for (let i = 0; i < (n || 1); i++) {
    out.push(mkZombie(loc.enemies[Math.floor(Math.random() * loc.enemies.length)]));
  }
  return out;
}

// ---------- EXPLORE ----------
function showExplore(locId, quiet = false) {
  screen = 'explore';
  const p = P();
  const loc = LOCATIONS[locId || p.locationId];
  if (!loc) return goHome();
  ZScene.setMode('explore');
  if (!quiet) log(`<br>What do you do? <span class="sys">(depth ${p.depth} · noise ${Math.round(p.noise)} · ${stars(loc.danger)} ${loc.danger}/5)</span>`);
  const acts = loc.rooms.map(r => {
    if (p.searched?.[r.id]) return { label: `✓ ${r.name} <span class="sys">picked clean</span>`, disabled: true, fn: () => {} };
    if (r.gather) {
      const need = r.gather === 'wood' ? 'axe' : 'pick';
      return {
        label: `${r.icon || '🪓'} ${r.name}<br><small>fell: +6 ${need} · +2 hands · 20m</small>`,
        fn: () => enterRoom(loc.id, r.id)
      };
    }
    return {
      label: `${r.locked ? '🔒' : '🚪'} ${r.name}<br><small>may yield ${lootIcons(r.loot)}</small>`,
      fn: () => enterRoom(loc.id, r.id)
    };
  });
  const cleared = loc.rooms.filter(r => p.searched?.[r.id]).length;
  if (cleared >= loc.rooms.length) {
    if (!quiet) log(`<span class="sys">Every room is picked clean. What's left is deeper — and worse.</span>`);
    acts.push({ label: `🕳️ Push deeper<br><small>danger rising · push #${(p.deep || 0) + 1}</small>`, danger: true, fn: () => enterDeep(loc.id) });
  }
  acts.push({ label: '🏃 Return to camp', danger: true, fn: returnToCamp });
  acts.push({ label: '🎒 Inventory', fn: () => showInventory(() => showExplore(loc.id)) });
  setActions(acts);
}
function enterRoom(locId, roomId) {
  const p = P();
  const loc = LOCATIONS[locId];
  const room = loc.rooms.find(r => r.id === roomId);
  if (!room) return showExplore(locId, true);
  if (p.searched?.[roomId]) {
    log(`<span class="sys">✓ ${room.name} is picked clean. Nothing left but dust.</span>`);
    return showExplore(locId, true);
  }
  if (room.gather) return gatherNode(locId, roomId);
  exploreCtx = { loc: locId, room: roomId };
  p.depth += 1;
  advanceTime(p, 25 + Math.floor(Math.random() * 20));
  log(`<br><span class="title">— ${room.name} —</span><br>${room.text}`);
  // sanity flavor
  if (p.san < 50 && Math.random() < 0.3) {
    log(`<span class="san">For a second, the shadows form a face you know. Then it's just rubble. 🧠 −3</span>`, 'san');
    p.san = clamp(p.san - 3, 0, p.maxSan);
  }
  if (room.locked && !(p.weaponId === 'crowbar' && WEAPONS.crowbar.canOpen) && !(p.inv.lockpick > 0)) {
    log(`🔒 Locked. You need a <b>Lockpick</b> (merchant) or a <b>Crowbar</b>. Breaking it would be loud…`);
    setActions([
      { label: '🔨 Break in (+30 noise, danger)', danger: true, fn: () => { p.noise = clamp(p.noise + 30, 0, 100); ZScene.addNoiseRing(70); log(`CRASH. The lock gives. <span class="bad">Every dead thing within blocks heard that.</span>`); resolveEvent(loc, { ...room, dangerMod: (room.dangerMod || 0) + 2 }, true); } },
      { label: '⬅ Step back', fn: () => showExplore(locId) },
    ]);
    updateHUD(); sync3D();
    return;
  }
  if (room.locked && p.inv.lockpick > 0 && p.weaponId !== 'crowbar') {
    removeItem(p, 'lockpick', 1);
    log(`<span class="sys">Lockpick turns silently. The door opens.</span>`);
  } else if (room.locked) {
    log(`<span class="sys">Your crowbar finds the weak point. Quiet-ish.</span>`);
    p.noise = clamp(p.noise + 8, 0, 100);
  }
  resolveEvent(loc, room, false);
  updateHUD(); sync3D();
}

// gather nodes (trees, rock faces, camp deadfall): +3 with the right tool, +1 by hand.
// 20 min like Gather Nearby; shares the daily gather charges; one use per visit.
function gatherNode(locId, roomId) {
  const p = P();
  const loc = LOCATIONS[locId];
  const room = loc.rooms.find(r => r.id === roomId);
  if (p.gatherDay !== p.day) { p.gatherDay = p.day; p.gatherLeft = 3; }
  if ((p.gatherLeft ?? 3) <= 0) {
    log(`<span class="sys">You're worked out — hands blistered. Gathering shares <b>3 charges/day</b> across nearby & area nodes — back tomorrow.</span>`);
    updateHUD(); sync3D();
    return showExplore(locId, true);
  }
  const t = toolOf(p);
  const tooled = t.gather === room.gather;
  const n = tooled ? 6 : 2;
  exploreCtx = { loc: locId, room: roomId };
  p.depth += 1;
  advanceTime(p, 20);
  p.noise = clamp(p.noise + 8, 0, 100); // chopping echoes
  p.gatherLeft -= 1;
  let took = 0;
  for (let i = 0; i < n; i++) { if (addItem(p, room.gather, 1)) took++; }
  if (took === 0) p.gatherLeft += 1; // full pack: no work done, charge refunded
  const need = room.gather === 'wood' ? 'Fire Axe' : 'Pickaxe';
  if (took) log(`${room.icon || '🪓'} <b>+${took} ${itemName(room.gather)}</b>${tooled ? '' : ` <span class="sys">(bare hands — a ${need} would triple this)</span>`}${took < n ? ` <span class="sys">— pack full, ${n - took} left behind</span>` : ''}`, 'loot');
  else log(`🎒 No room. It will keep.`, 'bad');
  if (took > 0 && took < n) {
    // partial fit: offer to drop/use something for the remainder, like loot rooms
    const left = Array(n - took).fill(room.gather);
    updateHUD(); sync3D();
    return offerDrop(left, () => afterRoom(loc));
  }
  useSave && useSave();
  updateHUD(); sync3D();
  afterRoom(loc);
}

function enterDeep(locId) {
  // All rooms dry: the only way forward is deeper, at escalating danger.
  const p = P();
  const loc = LOCATIONS[locId];
  p.deep = (p.deep || 0) + 1;
  p.depth += 1;
  exploreCtx = { loc: locId, room: '__deep' };
  advanceTime(p, 30);
  log(`<br><span class="title">— Deeper Dark (push #${p.deep}) —</span><br>You push past the picked-clean rooms, into parts of the ${loc.name} nobody visits. The air is worse here. <span class="bad">Danger rising.</span>`);
  resolveEvent(loc, { id: '__deep', loot: loc.loot[Math.floor(Math.random() * loc.loot.length)], dangerMod: 1 + p.deep }, false);
  updateHUD(); sync3D();
}

function resolveEvent(loc, room, forced) {
  const p = P();
  const type = forced ? 'combat' : encounterRoll(p, loc, room.dangerMod || 0, S.weather);
  ZScene.addNoiseRing(p.noise);
  if (type === 'combat') {
    // Stars decide how many can be on you at once: a calm run rarely pairs,
    // a 5★ run often does.
    const pairChance = 0.12 + (loc.danger + (room.dangerMod || 0)) * 0.07;
    const n = Math.random() < pairChance ? 2 : 1;
    const enemies = pickEnemies(loc, n);
    log(`<br>🧟 <b>${enemies.map(e => e.name).join(' + ')}</b> lurches from the dark!`);
    startCombat(enemies);
  } else if (type === 'loot') {
    const table = room.loot || 'general';
    const items = rollLoot(table, (loc.danger || 0) + (room.dangerMod || 0));
    // food rooms always pay something edible on top
    if (table === 'food') items.push('canned_food');
    // home-ground advantage from chosen site
    const site = p.base?.site;
    if (site === 'forest_edge' && table === 'wood') items.push('wood');
    if (site === 'quarry_overlook' && table === 'stone') items.push('stone');
    // tool bonus: the equipped belt tool earns its slot
    const t = toolOf(p);
    if (table === 'wood' && t.gather === 'wood') items.push('wood');
    if (table === 'stone' && t.gather === 'stone') items.push('stone');
    ZScene.spawnLoot(items.length);
    log(`<br>🔎 You search carefully <span class="sys">(+25 min, better finds, but the light is dying)</span>…`);
    advanceTime(p, 25);
    const got = [], dropped = [];
    for (const id of items) {
      if (addItem(p, id, 1)) { got.push(itemName(id)); }
      else { dropped.push(itemName(id)); }
    }
    p.looted += got.length;
    if (got.length) log(`🎒 Found: <b>${got.join(', ')}</b>`, 'loot');
    if (dropped.length) {
      log(`<span class="bad">Backpack full! You must leave: ${dropped.join(', ')}</span> — or drop something now:`);
      return offerDrop(dropped, () => afterRoom(loc));
    }
    if (Math.random() < 0.18) { // loot noise → follow-up zombie 18%
      log(`<span class="sys">Glass clinks. Something heard you…</span>`);
      p.noise = clamp(p.noise + 15, 0, 100);
      if (Math.random() < 0.5) { startCombat(pickEnemies(loc, 1)); return; }
    }
    afterRoom(loc);
  } else if (type === 'trap') {
    const dmg = 6 + Math.floor(Math.random() * 10);
    p.hp = clamp(p.hp - dmg, 0, p.maxHp);
    p.san = clamp(p.san - 3, 0, p.maxSan);
    log(`<br>⚠️ <span class="bad">A tripwire of cans — or teeth. ${dmg} damage, nerves frayed (🧠 −3).</span>`);
    if (checkDeath('Bled out from a trap in the dark.')) return;
    afterRoom(loc);
  } else if (type === 'environmental') {
    envEvent(loc);
  } else if (type === 'animal') {
    animalEvent(loc);
  } else if (type === 'npc' || type === 'rare') {
    if (Math.random() < 0.5) npcEvent(loc); else rareEvent(loc);
  } else if (type === 'hallucination') {
    hallucinationEvent(loc);
  } else {
    log(`<br><span class="sys">Nothing. Dust, wind, your own breathing. Sometimes that's the best outcome.</span>`);
    p.san = clamp(p.san + 2, 0, p.maxSan);
    afterRoom(loc);
  }
}

function afterRoom(loc) {
  const p = P();
  p.explored += 1;
  // room fully resolved (searched, survived, or cleared) → dry for this visit
  if (exploreCtx && exploreCtx.loc === loc.id && exploreCtx.room) {
    (p.searched ??= {})[exploreCtx.room] = true;
  }
  if (p.hp <= 0) return void checkDeath('Collapsed between the shelves.');
  // horde pressure on depleted locations
  const visits = S.world.depleted[loc.id] || 0;
  if (visits >= 3 && Math.random() < 0.25) return hordeEvent(loc);
  // "one more room?" tension prompt
  log(`<span class="sys">— Depth ${p.depth} · ${fmtTime(p)}${isNight(p) ? ' · 🌙 NIGHT' : ''} · HP ${Math.round(p.hp)} · 🧠 ${Math.round(p.san)} · Dura ${Math.round(p.weaponDura)} —</span>`);
  log(`<i>"I could search one more room… but my sanity is getting low. Durability is thin. If I stay, it might be night."</i>`);
  useSave && useSave();
  updateHUD(); sync3D();
  setActions([
    { label: '🔎 Keep exploring', primary: true, fn: () => showExplore(loc.id) },
    { label: '🏃 Return to camp', danger: true, fn: returnToCamp },
    { label: '🎒 Inventory', fn: () => showInventory(() => afterRoomContinue(loc)) },
  ]);
}
function afterRoomContinue(loc) {
  setActions([
    { label: '🔎 Keep exploring', primary: true, fn: () => showExplore(loc.id) },
    { label: '🏃 Return to camp', danger: true, fn: returnToCamp },
  ]);
}
function offerDrop(pending, done) {
  const p = P();
  const entries = Object.entries(p.inv);
  if (!entries.length) { log(`No room and nothing to drop — leaving the find.`); done(); return; }
  log(`<b>Pack full — found ${pending.map(itemName).join(', ')}.</b> Use a supply, drop something, or walk away:`);
  const usable = entries.filter(([id]) => ITEMS[id] && ['heal', 'sanity', 'food', 'water'].includes(ITEMS[id].type)).slice(0, 3);
  setActions([
    ...usable.map(([id, qty]) => ({
      label: `Use ${ITEMS[id].name} ×${qty}<br><small>frees 1 slot</small>`,
      fn: () => {
        useItemSilent(id);
        updateHUD(); sync3D();
        while (pending.length && invCount(p) < invCap(p)) {
          const take = pending.shift();
          addItem(p, take, 1);
          log(`Took <b>${itemName(take)}</b>.`, 'good');
        }
        if (!pending.length) done();
        else offerDrop(pending, done);
      }
    })),
    ...entries.slice(0, 5).map(([id, qty]) => ({
      label: `Drop ${itemName(id)} ×${qty}`,
      fn: () => {
        removeItem(p, id, 1);
        const take = pending.shift();
        addItem(p, take, 1);
        log(`Dropped ${itemName(id)}, took <b>${itemName(take)}</b>.`, 'good');
        if (pending.length && invCount(p) >= invCap(p)) offerDrop(pending, done);
        else {
          if (pending.length) log(`<span class="sys">Left behind: ${pending.map(itemName).join(', ')}</span>`);
          done();
        }
      }
    })),
    { label: `Leave it (${pending.map(itemName).join(', ')})`, danger: true, wide: true, fn: done },
  ]);
}

function envEvent(loc) {
  const p = P();
  const w = S.weather;
  if (w === 'fog') { log(`<br>🌫️ <b>FOG.</b> Visibility gone. Zombie detection reduced — but you hear breathing nearby. <span class="sys">Combat chance down this room, sanity −2.</span>`); p.san = clamp(p.san - 2, 0, p.maxSan); }
  else if (w === 'rain' || w === 'storm') { log(`<br>🌧️ Rain hammers the roof. A leak shorts a light — sparks, then dark. <span class="sys">You pocket some clean water.</span>`); addItem(p, 'water_bottle', 1) || log(`<span class="sys">No room for the water.</span>`); }
  else if (isNight(p)) { log(`<br>🌙 Night settles over ${loc.name}. Distant howls answer each other. <span class="san">🧠 −4. Loot feels richer in the dark.</span>`); p.san = clamp(p.san - 4, 0, p.maxSan); }
  else { log(`<br>☀️ A shaft of daylight cuts the gloom. You breathe. <span class="san">🧠 +3.</span>`); p.san = clamp(p.san + 3, 0, p.maxSan); }
  advanceTime(p, 15);
  afterRoom(loc);
}

function npcEvent(loc) {
  const p = P();
  const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
  log(`<br>🧍 <b>${npc.name}</b><br>"${npc.text}"`);
  const acts = [];
  if (npc.quest && (p.inv[npc.quest.need] || 0) >= npc.quest.qty) {
    acts.push({
      label: `🤝 Hand over ${npc.quest.qty}× ${itemName(npc.quest.need)}`, primary: true,
      fn: () => {
        removeItem(p, npc.quest.need, npc.quest.qty);
        p.money += npc.quest.reward.money || 0; p.rep += 5;
        if (npc.quest.reward.san) p.san = clamp(p.san + npc.quest.reward.san, 0, p.maxSan);
        log(`<span class="good">Reward: $${npc.quest.reward.money || 0}, +5 rep.</span> They'll remember this.`, 'good');
        afterRoom(loc);
      }
    });
  }
  acts.push({ label: '💬 Talk (sanity +4, time −20m)', fn: () => { p.san = clamp(p.san + 4, 0, p.maxSan); advanceTime(p, 20); log(`<span class="san">Talking to another living voice steadies you. 🧠 +4.</span>`); afterRoom(loc); } });
  // moral choice: wounded survivor
  if (Math.random() < 0.5) {
    log(`A wounded survivor crawls from behind debris, clutching a backpack. <i>"Please… I can pay…"</i> Blood leaks from his leg.`);
    acts.push({ label: '❤️ Help (bandage → +rep, +sanity)', fn: () => {
      if ((p.inv.bandage || 0) > 0) { removeItem(p, 'bandage', 1); p.rep += 8; p.san = clamp(p.san + 6, 0, p.maxSan); p.money += 15; log(`<span class="good">You bind his leg. He presses $15 and a whispered cache location into your hand. Rep +8.</span>`); addItem(p, 'scrap', 2) || 0; }
      else { p.san = clamp(p.san - 4, 0, p.maxSan); log(`You have no bandage. He nods like he expected this. <span class="san">🧠 −4.</span>`); }
      advanceTime(p, 25); afterRoom(loc);
    } });
    acts.push({ label: '🥾 Rob him (−rep, −sanity, +loot)', danger: true, fn: () => {
      p.rep -= 10; p.san = clamp(p.san - 8, 0, p.maxSan); p.money += 30; addItem(p, 'canned_food', 1) || 0;
      log(`<span class="bad">You take his pack. His eyes follow you out. −10 rep, 🧠 −8. The cans clatter like accusations.</span>`);
      advanceTime(p, 10); afterRoom(loc);
    } });
    acts.push({ label: '🚶 Leave him', fn: () => { p.san = clamp(p.san - 2, 0, p.maxSan); log(`You walk past. You hear him breathing for a long time. <span class="san">🧠 −2.</span>`); advanceTime(p, 10); afterRoom(loc); } });
  } else {
    acts.push({ label: '👋 Move on', fn: () => { advanceTime(p, 10); afterRoom(loc); } });
  }
  setActions(acts);
}

function rareEvent(loc) {
  const p = P();
  const roll = Math.random();
  if (roll < 0.4) {
    log(`<br>✨ <b>RARE FIND.</b> Behind a collapsed shelf: a sealed military cache.`);
    addItem(p, 'metal', 2) || log(`No room for metal.`);
    p.money += 40;
    log(`<span class="gold">+2 Metal Parts, +$40.</span> Rare stays rare — don't expect this twice.`);
  } else if (roll < 0.7) {
    log(`<br>📻 A radio crackles: <i>"…eastern district… get out…"</i> then static. The frequency list is intact.`);
    p.san = clamp(p.san - 3, 0, p.maxSan);
    log(`<span class="sys">You memorize the frequency. Future events may answer it. (🧠 −3)</span>`);
    p.flags.radio = true;
  } else {
    log(`<br>🩸 A survivor's journal, last page still legible: <i>"Day 41. If you read this — the pharmacy back panel is loose."</i>`);
    addItem(p, 'medkit', 1) ? log(`<span class="good">You pry the panel. Medkit!</span>`) : log(`<span class="sys">You find the medkit but can't carry it.</span>`);
  }
  advanceTime(p, 20);
  afterRoom(loc);
}

// ---------- WILDLIFE ----------
function boarFoe() { return mkZombie('boar'); }   // one source of truth for boar stats
function giveItems(ids, loc, note) {
  // hunt rewards with backpack-full handling
  const p = P();
  const got = [], dropped = [];
  for (const id of ids) {
    if (addItem(p, id, 1)) got.push(itemName(id));
    else dropped.push(itemName(id));
  }
  p.looted += got.length;
  if (got.length) log(`${note || '🎒 Found:'} <b>${got.join(', ')}</b>`, 'loot');
  if (dropped.length) {
    log(`<span class="bad">Backpack full! Leave: ${dropped.join(', ')}</span> — or drop something:`);
    return offerDrop(dropped, () => afterRoom(loc));
  }
  afterRoom(loc);
}
function animalEvent(loc) {
  const pool = ANIMAL_POOL[loc.id] || ['crow'];
  const kind = pool[Math.floor(Math.random() * pool.length)];
  if (kind === 'boar') return boarEvent(loc);
  if (kind === 'dog') return dogEvent(loc);
  if (kind === 'crow') return crowEvent(loc);
  return preyEvent(loc, kind);
}
function preyEvent(loc, kind, quiet = false) {
  const p = P();
  const a = ANIMALS[kind];
  if (!quiet) log(`<br>${a.icon} <b>${a.name}</b><br>${a.text}`);
  const take = () => {
    const ids = [];
    for (let i = 0; i < a.meat; i++) ids.push('raw_meat');
    const lc = a.leatherC ?? (a.leather ? 1 : 0);
    if (Math.random() < lc) for (let i = 0; i < Math.max(1, a.leather); i++) ids.push('leather');
    p.noise = clamp(p.noise + 8, 0, 100);
    giveItems(ids, loc, `🥩 Dressed. Taken:`);
  };
  setActions([
    { label: `🏃 Chase it<br><small>${a.sta} sta · ${Math.round(a.chase * 100)}% · ${a.mins}m</small>`, primary: true, fn: () => {
      if (p.sta < a.sta) { log(`Too winded to chase. Stalk it or let it go.`); return preyEvent(loc, kind, true); }
      p.sta = clamp(p.sta - a.sta, 0, p.maxSta);
      advanceTime(p, a.mins);
      if (Math.random() < a.chase) { log(`Got it!`); take(); }
      else { log(`Gone between the rubble. <span class="sys">Only wasted breath.</span>`); afterRoom(loc); }
    } },
    { label: `🤫 Stalk it<br><small>+25m · ${Math.round(a.sneak * 100)}%</small>`, fn: () => {
      advanceTime(p, 25);
      if (Math.random() < a.sneak) { log(`Clean kill.`); take(); }
      else { log(`It spooked at the last step.`); afterRoom(loc); }
    } },
    { label: `🚶 Let it go<br><small>+5m</small>`, fn: () => { advanceTime(p, 5); log(`<span class="sys">Not today. The ${a.name.toLowerCase()} lives.</span>`); afterRoom(loc); } },
  ]);
  updateHUD(); sync3D();
}
function boarEvent(loc) {
  const p = P();
  log(`<br>🐗 <b>Wild Boar</b><br>It found you first. Head down, tusks up, pawing the dirt. This one fights back — but it's walking meat and leather.`);
  setActions([
    { label: `⚔️ Fight it<br><small>meat ×2 + leather if you win</small>`, primary: true, danger: true, fn: () => {
      log(`The boar <b>charges!</b>`);
      startCombat([boarFoe()]);
    } },
    { label: `🤫 Sneak past<br><small>70% · 20m</small>`, fn: () => {
      advanceTime(p, 20);
      if (Math.random() < 0.7) { log(`Past it. Don't breathe.`); afterRoom(loc); }
      else { log(`<span class="bad">It heard you!</span>`); startCombat([boarFoe()]); }
    } },
    { label: `🏃 Back away<br><small>10m</small>`, fn: () => { advanceTime(p, 10); log(`<span class="sys">No pork today. No holes in you, either.</span>`); afterRoom(loc); } },
  ]);
  updateHUD(); sync3D();
}
function dogEvent(loc) {
  const p = P();
  log(`<br>🐕 <b>Stray Dog</b><br>Ribs showing, tail low — but its eyes are sharp. It whines at your pack. It smells your food.`);
  setActions([
    { label: `🍖 Share food<br><small>1 canned · it may repay you</small>`, primary: true, fn: () => {
      if (!(p.inv.canned_food > 0)) { p.san = clamp(p.san - 2, 0, p.maxSan); advanceTime(p, 5); log(`You have nothing to share. It whines and backs off. <span class="san">🧠 −2.</span>`); return afterRoom(loc); }
      removeItem(p, 'canned_food', 1);
      advanceTime(p, 20);
      p.san = clamp(p.san + 4, 0, p.maxSan); p.rep += 2;
      log(`It wolfs the food — then grabs your sleeve and drags you to a buried cache! <span class="san">🧠 +4, Rep +2.</span>`);
      giveItems(rollLoot('general', loc.danger || 0), loc, `Cache:`);
    } },
    { label: `🔪 Hunt it<br><small>meat ×2 + leather · −rep −sanity</small>`, danger: true, fn: () => {
      advanceTime(p, 15);
      p.noise = clamp(p.noise + 10, 0, 100);
      p.rep -= 5; p.san = clamp(p.san - 6, 0, p.maxSan);
      log(`<span class="bad">It trusted you right up to the end. −5 rep, 🧠 −6.</span>`);
      giveItems(['raw_meat', 'raw_meat', 'leather'], loc, `Taken:`);
    } },
    { label: `🚶 Leave it<br><small>5m</small>`, fn: () => { advanceTime(p, 5); p.san = clamp(p.san - 1, 0, p.maxSan); log(`Its eyes follow you all the way out. <span class="san">🧠 −1.</span>`); afterRoom(loc); } },
  ]);
  updateHUD(); sync3D();
}
function crowEvent(loc) {
  const p = P();
  log(`<br>🐦 <b>Crow</b><br>It lands on a wire and watches you with one black eye. Crows know things.`);
  setActions([
    { label: `👀 Watch it<br><small>10m · omen?</small>`, fn: () => {
      advanceTime(p, 10);
      if (Math.random() < 0.5) { p.san = clamp(p.san - 2, 0, p.maxSan); log(`Suddenly every crow for blocks takes flight, screaming east. Something moved them. <span class="san">🧠 −2.</span>`); }
      else { p.san = clamp(p.san + 2, 0, p.maxSan); log(`It cocks its head, unbothered. The world keeps turning. <span class="san">🧠 +2.</span>`); }
      afterRoom(loc);
    } },
    { label: `🏹 Hunt it<br><small>40% · meat · 15m</small>`, fn: () => {
      advanceTime(p, 15);
      if (Math.random() < 0.4) { p.noise = clamp(p.noise + 5, 0, 100); giveItems(['raw_meat'], loc, `One stone, one bird. Taken:`); }
      else { log(`Missed. It laughs at you in crow.`); afterRoom(loc); }
    } },
    { label: `🚶 Move on`, fn: () => { advanceTime(p, 5); afterRoom(loc); } },
  ]);
  updateHUD(); sync3D();
}

function hallucinationEvent(loc) {
  const p = P();
  const gas = p.accessoryId === 'gas_mask';
  const r = Math.random();
  if (r < 0.4) {
    log(`<br><span class="san">You hear a child crying. "Help me…" You follow the sound. The hallway is empty. The crying continues. You turn around. Nothing. … Your hands are shaking. 🧠 −5</span>`);
    p.san = clamp(p.san - (gas ? 2 : 5), 0, p.maxSan);
  } else if (r < 0.7) {
    log(`<br><span class="san">A figure waves at you from the ${loc.rooms[0].name}. You wave back. It has no face. 🧠 −6</span>`);
    p.san = clamp(p.san - (gas ? 3 : 6), 0, p.maxSan);
    // fake loot that vanishes
    log(`<span class="sys">There was a medkit. There is no medkit. There never was.</span>`);
  } else {
    // false enemy: costs stamina/noise but no real fight
    log(`<br><span class="san">🧟 A ROTTEN CHARGES YOU — you swing wildly… and hit empty air. Your heart hammers. Stamina −15, noise +10.</span>`);
    p.sta = clamp(p.sta - 15, 0, p.maxSta);
    p.noise = clamp(p.noise + 10, 0, 100);
    ZScene.addNoiseRing(40);
  }
  advanceTime(p, 15);
  afterRoom(loc);
}

function hordeEvent(loc) {
  const p = P();
  log(`<br><span class="bad">You hear a distant roar. Then another. Then dozens. Your radio crackles: <i>"Everyone… get out of the eastern district."</i> You look outside. <b>A HORDE IS APPROACHING.</b></span>`);
  setActions([
    { label: '🤫 Hide (sanity test)', fn: () => {
      if (Math.random() < 0.5) { p.san = clamp(p.san - 6, 0, p.maxSan); log(`You hold your breath under rubble as they pass. <span class="san">🧠 −6.</span>`, 'san'); advanceTime(p, 60); afterRoom(loc); }
      else { log(`<span class="bad">They smell you.</span>`); startCombat(pickEnemies(loc, 2)); }
    } },
    { label: '🏃 Run (+noise, stamina)', danger: true, fn: () => {
      p.sta = clamp(p.sta - 25, 0, p.maxSta); p.noise = clamp(p.noise + 20, 0, 100);
      if (Math.random() < 0.6) { log(`You outrun the edge of the horde, lungs burning.`); advanceTime(p, 40); returnToCamp(true); }
      else { log(`<span class="bad">Runners cut you off!</span>`); startCombat(pickEnemies(loc, 2)); }
    } },
    { label: '⚔️ Fight (near-suicidal)', danger: true, fn: () => { log(`<span class="bad">Fine. You're going in.</span>`); startCombat(pickEnemies(loc, 3)); } },
  ]);
}

function returnToCamp(fled = false) {
  const p = P();
  const loc = LOCATIONS[p.locationId];
  const mins = loc ? loc.distance * 25 : 30;
  advanceTime(p, mins);
  p.locationId = null; p.depth = 0;
  ZScene.spawnLoot(0);
  if (isNight(p) && !fled && Math.random() < 0.35) {
    log(`<br>🌙 <span class="bad">Night ambush on the road home!</span>`);
    // was a hand-built literal: duplicated the numbers, missed fleeMod/sanityHit,
    // and shipped max:34 > hp:30 so the bar started part-drained
    startCombat([mkZombie('runner')], true);
    return;
  }
  if (P().base) log(fled ? `<br>You stumble into camp at ${fmtTime(p)}.` : `<br>You make it back as ${fmtTime(p)} ticks over.`);
  else log(`<br>You melt back into the open ground at ${fmtTime(p)}. No walls. No fire. <span class="sys">Scout a site — or keep drifting.</span>`);
  useSave && useSave();
  goHome();
}

// ---------- COMBAT (wild-encounter style: intro, lunges, bars, damage numbers) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function lockActions() {
  setActions([{ label: '💥 …', disabled: true, wide: true, fn: () => {} }]);
}
function updateBattleHUD() {
  const hud = $('battle-hud');
  if (!hud) return;
  const e = combat?.enemies[0];
  hud.classList.toggle('hidden', !combat || !e);
  if (!combat || !e) return;
  const p = P();
  $('foe-name').innerHTML = `🧟 Wild ${e.name}${e.resist > 0 ? ` <span style="color:#9ab">🛡️${Math.round(e.resist * 100)}%</span>` : ''}${e.bleed > 0 ? ` <span style="color:#e05656">🩸${e.bleed}</span>` : ''}`;
  const f = clamp(e.hp / e.max, 0, 1);
  const fh = $('foe-hp');
  fh.style.width = (f * 100) + '%';
  fh.style.background = f < 0.25 ? '#e05656' : f < 0.5 ? '#e8b64c' : '';
  $('ally-name').textContent = 'SURVIVOR';
  $('ally-num').textContent = `❤️ ${Math.max(0, Math.round(p.hp))}/${p.maxHp} · ⚡${Math.round(p.sta)}`;
  const a = clamp(p.hp / p.maxHp, 0, 1);
  const ah = $('ally-hp');
  ah.style.width = (a * 100) + '%';
  ah.style.background = a < 0.25 ? '#e05656' : a < 0.5 ? '#e8b64c' : '';
}
function dmgFloat(txt, side, cls = '') {
  const layer = $('dmg-layer');
  if (!layer) return;
  const d = document.createElement('div');
  d.className = `dmg ${side} ${cls}`;
  d.textContent = txt;
  layer.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}
function startCombat(enemies, roadside = false) {
  screen = 'combat';
  combat = { enemies, guard: null, roadside: !!roadside, busy: true };
  ZScene.setMode('combat'); // camera swoops to face-off view
  ZScene.spawnZombies(enemies);
  ZScene.badge(`🧟 COMBAT — ${enemies.length} HOSTILE${enemies.length > 1 ? 'S' : ''}`);
  const e = enemies[0];
  log(`<br><span class="title">⚔️ Wild ${e.name.toUpperCase()} appeared!</span> <span class="sys">— ${ZOMBIES[e.id]?.behavior || ''}</span>`);
  log(`Go! <b>${weaponOf(P()).name}</b>!`);
  updateBattleHUD();
  ZScene.combatIntro(); // zombies slide in from the dark
  lockActions();
  updateHUD(); sync3D();
  setTimeout(() => { if (combat && combat.enemies.length) combatTurn(); }, 950);
}
async function combatTurn() {
  const p = P();
  if (!combat) return;
  combat.busy = false;
  const e = combat.enemies[0];
  if (!e) return combatWin();
  // Bleed ticks first, before you act — knives pay off across rounds, not on
  // impact (§18). Stacks fade by one a round, so a bleed has to be re-opened.
  const ticks = bleedTick(combat.enemies);
  if (ticks.length) {
    for (const t of ticks) { t.foe.hp -= t.dmg; t.foe.bleed = t.next; log(`🩸 <span class="bad">${t.foe.name} bleeds for ${t.dmg}.</span>`); }
    dmgFloat(`-${ticks[0].dmg}`, 'foe', 'bleed');
  }
  if (combat.enemies[0].hp <= 0) { updateBattleHUD(); await foeFaint(combat.enemies[0]); return; }
  // Screamer: one shriek per body. It doesn't hit hard — it makes your noise
  // problem worse, and answers come if you were already loud.
  if (e.scream && !e.screamed) {
    e.screamed = true;
    p.noise = clamp(p.noise + 25, 0, 100);
    ZScene.addNoiseRing(p.noise);
    ZScene.shake(0.4);
    log(`📢 <span class="bad">The ${e.name} throws its head back and SCREAMS.</span> <span class="sys">Noise ${Math.round(p.noise)}.</span>`);
    updateHUD();
    if (p.noise >= 55) {
      const pack = mkZombie(Math.random() < 0.5 ? 'walker' : 'rotten');
      combat.enemies.push(pack);
      ZScene.spawnZombies(combat.enemies);
      ZScene.badge(`🧟 COMBAT — ${combat.enemies.length} HOSTILES`);
      log(`<span class="bad">Something answers. A ${pack.name} shambles out of the dark.</span>`);
      updateBattleHUD();
    }
  }
  const w = weaponOf(p);
  const tier = sanityTier(p.san);
  log(`<span class="sys">— Wild ${e.name} · ${w.name} (dura ${Math.round(p.weaponDura)})${tier !== 'stable' ? ` · 🧠${tier}` : ''}${p.hunger <= 0 ? ' · 🍖starving' : ''}${p.thirst <= 0 ? ' · 💧parched' : ''} — What will SURVIVOR do?</span>`);
  if (maybePanic(p)) {
    log(`<span class="san">😱 PANIC! Frozen — the enemy strikes first.</span>`);
    const r = zombieAttack(p, e, null);
    ZScene.strike('enemy'); ZScene.shake(0.5);
    dmgFloat(`-${r.dmg}`, 'ally');
    log(`😱 <span class="san">💥${r.dmg} while frozen!</span>`);
    updateBattleHUD();
    if (checkDeath('Torn apart while panic-locked.')) return;
    p.noise = clamp(p.noise + 5, 0, 100);
  }
  setActions([
    { label: `🗡️ Quick<br><small>${w.stamina} sta · fast</small>`, primary: true, fn: () => doAttack('quick') },
    { label: `💥 Heavy<br><small>${Math.round(w.stamina * 1.8)} sta · 1.7× · loud</small>`, fn: () => doAttack('heavy') },
    { label: `🎯 Head<br><small>high crit · risky</small>`, fn: () => doAttack('head') },
    { label: `💨 Dodge<br><small>10 sta · avoid</small>`, fn: () => doGuard('dodge') },
    { label: `🛡️ Block<br><small>6 sta · halve</small>`, fn: () => doGuard('block') },
    { label: `🏃 Flee<br><small>${Math.round(fleeChance(p, combat.enemies, fleeBonus()) * 100)}%</small>`, danger: true, fn: doFlee },
    { label: `🩹 Bandage (${P().inv.bandage || 0})`, fn: () => {
      if (combat.busy) return;
      if (!(P().inv.bandage > 0)) { log(`No bandages.`); return combatTurn(); }
      combat.busy = true; lockActions();
      useItemSilent('bandage');
      updateBattleHUD();
      enemyStrike();
    } },
    { label: '🎒 Item…', fn: () => combatInventory() },
  ]);
  updateHUD(); sync3D(); updateBattleHUD();
}
function useItemSilent(id) {
  const p = P();
  const it = ITEMS[id];
  if (!it || !(p.inv[id] > 0)) return false;
  removeItem(p, id, 1);
  if (it.hp) p.hp = clamp(p.hp + it.hp, 0, p.maxHp);
  if (it.sta) p.sta = clamp(p.sta + it.sta, 0, p.maxSta);
  if (it.san) p.san = clamp(p.san + it.san, 0, p.maxSan);
  if (it.hunger) p.hunger = clamp(p.hunger + it.hunger, 0, p.maxHunger);
  if (it.thirst) p.thirst = clamp(p.thirst + it.thirst, 0, p.maxThirst);
  log(`Used <b>${it.name}</b>.`, 'good');
  advanceTime(p, 5);
  return true;
}
function combatInventory() {
  if (combat.busy) return;
  const usable = Object.entries(P().inv).filter(([id]) => ITEMS[id] && ['heal', 'sanity', 'food', 'water'].includes(ITEMS[id].type));
  if (!usable.length) { log(`<span class="sys">Nothing usable.</span>`); return combatTurn(); }
  setActions([
    ...usable.map(([id, qty]) => ({ label: `${ITEMS[id].name} ×${qty}<br><small>${ITEMS[id].desc}</small>`, fn: () => {
      if (combat.busy) return;
      combat.busy = true; lockActions();
      useItemSilent(id);
      updateBattleHUD();
      enemyStrike();
    } })),
    { label: '⬅ Back', wide: true, fn: () => combatTurn() },
  ]);
}
async function doAttack(action) {
  const p = P();
  if (!combat || combat.busy) return;
  const e = combat.enemies[0];
  if (!e) return;
  const r = playerAttack(p, e, action);
  if (!r.ok) { log(`<span class="bad">${r.reason} Guard or flee instead.</span>`); updateHUD(); sync3D(); return combatTurn(); }
  combat.busy = true;
  lockActions();
  ZScene.addNoiseRing(p.noise);
  const aname = action === 'heavy' ? 'HEAVY SLAM' : action === 'head' ? 'HEADSHOT' : 'QUICK STRIKE';
  ZScene.strike('player'); // lunge
  await sleep(380);
  try {
    if (r.miss) {
      log(`⚔️ ${aname} — <b>${r.dodged ? 'DODGED!' : 'MISSED!'}</b>${r.dodged ? ` <span class="sys">The ${e.name} slips the swing.</span>` : ''}`);
      dmgFloat(r.dodged ? 'DODGED' : 'MISS', 'foe', 'miss');
    } else {
      e.hp -= r.dmg;
      ZScene.damageZombie(0, e.hp <= 0);
      ZScene.shake(r.crit ? 0.8 : 0.45);
      dmgFloat(r.crit ? `${r.dmg}!` : `${r.dmg}`, 'foe', r.crit ? 'crit' : '');
      // trait riders — the payoff of §18 weapon personality
      let rider = '';
      if (r.bleed) { e.bleed = (e.bleed || 0) + r.bleed; rider += ` <span class="bad">🩸 Bleeding ×${e.bleed}</span>`; }
      if (r.sunder) { e.resist = Math.max(0, (e.resist || 0) - r.sunder); rider += ` <span class="sys">🔧 plating pried — resist ${Math.round(e.resist * 100)}%</span>`; }
      if (r.cleave && combat.enemies.length > 1) {
        const e2 = combat.enemies[1]; e2.hp -= r.cleave;
        rider += ` <span class="sys">↩ follow-through → ${e2.name} ${r.cleave}</span>`;
      }
      updateBattleHUD();
      const flinch = r.stunned ? ` <span class="good">Foe flinched!</span>`
        : e.noStun ? ` <span class="sys">The ${e.name} shrugs it off.</span>` : '';
      if (r.crit) log(`⚔️ ${aname} — <span class="gold">💥${r.dmg} CRIT!</span>${flinch}${rider}`);
      else log(`⚔️ ${aname} — 💥${r.dmg}!${flinch}${rider}`);
      await sleep(520);
    }
    updateHUD(); sync3D(); updateBattleHUD();
    if (e.hp <= 0) { await foeFaint(e); return; }
    // knockback: a heavy stun from a blunt weapon shoves the foe to the back
    if (r.stunned && weaponOf(P()).trait === 'knockback' && combat.enemies.length > 1) {
      const shoved = combat.enemies.shift(); combat.enemies.push(shoved);
      log(`<span class="sys">${shoved.name} is knocked to the back of the pack.</span>`);
      ZScene.spawnZombies(combat.enemies); updateBattleHUD();
    }
    if (r.stunned) { combat.busy = false; return combatTurn(); } // free move
    await enemyStrike();
  } catch (err) {
    console.error(err);
    combat.busy = false;
    combatTurn();
  }
}
async function foeFaint(e) {
  const p = P();
  p.kills += 1;
  const cash = 3 + Math.floor(Math.random() * 8);
  p.money += cash;
  log(`<span class="good">☠️ Wild ${e.name} fainted! Found $${cash}.</span>`);
  dmgFloat('FAINTED', 'foe', 'faint');
  if (e.id === 'boar') {
    const got = [];
    for (const id of ['raw_meat', 'raw_meat', 'leather']) {
      if (addItem(p, id, 1)) got.push(itemName(id));
    }
    if (got.length) log(`🥩 Butchered: <span class="good">${got.join(', ')}</span>${got.length < 3 ? ' <span class="sys">(no room for the rest)</span>' : ''}`);
  }
  if (Math.random() < 0.3 && addItem(p, 'scrap', 1)) log(`<span class="sys">You pry something useful off the body.</span>`);
  updateBattleHUD();
  await sleep(650);
  combat.enemies.shift();
  if (!combat.enemies.length) return combatWin();
  log(`Wild <b>${combat.enemies[0].name}</b> appeared!`);
  ZScene.spawnZombies(combat.enemies);
  ZScene.combatIntro();
  updateBattleHUD(); updateHUD(); sync3D();
  await sleep(750);
  if (!combat) return;
  combat.busy = false;
  combatTurn();
}
async function doGuard(g) {
  if (!combat || combat.busy) return;
  combat.busy = true;
  lockActions();
  combat.guard = g;
  log(g === 'dodge' ? `SURVIVOR is crouching… <b>get ready to dodge!</b>` : `SURVIVOR <b>braced for impact!</b>`);
  await sleep(300);
  try { await enemyStrike(); }
  catch (err) { console.error(err); combat.busy = false; combatTurn(); }
}
async function enemyStrike() {
  const p = P();
  const e = combat?.enemies[0];
  if (!e) { if (combat) combat.busy = false; return combatWin(); }
  const g = combat.guard;
  combat.guard = null;
  ZScene.strike('enemy'); // zombie lunges
  await sleep(380);
  const r = zombieAttack(p, e, g);
  advanceTime(p, 8);
  ZScene.shake(0.5);
  dmgFloat(r.dodged ? 'EVADED!' : `-${r.dmg}`, 'ally', r.dodged ? 'miss' : '');
  if (r.dodged) log(`<span class="good">💨 Evaded!</span>`);
  else log(`🧟 ${e.name} — 💥${r.dmg} to you!${p.armorId !== 'none' ? ` <span class="sys">(armor helped)</span>` : ''}`);
  updateBattleHUD();
  if (checkDeath(`Killed by a ${e.name}.`)) return;
  if (p.san < 20 && Math.random() < 0.1) { p.san = clamp(p.san - 3, 0, p.maxSan); log(`<span class="san">Blood on your hands — is it yours? 🧠 −3</span>`); }
  updateHUD(); sync3D(); updateBattleHUD();
  await sleep(420);
  if (!combat) return;
  combat.busy = false;
  combatTurn();
}
async function doFlee() {
  const p = P();
  if (!combat || combat.busy) return;
  combat.busy = true;
  lockActions();
  const c = fleeChance(p, combat.enemies, fleeBonus());
  const wasRoad = combat.roadside;
  advanceTime(p, 10);
  await sleep(350);
  if (Math.random() < c) {
    log(`<span class="good">🏃 Got away safely!</span>`);
    p.noise = clamp(p.noise + 10, 0, 100);
    combat = null;
    updateBattleHUD();
    updateHUD(); sync3D();
    if (wasRoad) goHome();
    else if (p.locationId) showExplore(p.locationId);
    else goHome();
  } else {
    log(`<span class="bad">Can't escape!</span>`);
    p.sta = clamp(p.sta - 10, 0, p.maxSta);
    try { await enemyStrike(); }
    catch (err) { console.error(err); combat.busy = false; combatTurn(); }
  }
}
function combatWin() {
  const wasRoad = combat?.roadside;
  combat = null;
  updateBattleHUD(); // hide bars
  const p = P();
  p.san = clamp(p.san - 2, 0, p.maxSan);
  log(`<span class="sys">Silence. Your hands won't stop shaking for a while. (🧠 −2)</span>`);
  ZScene.spawnZombies([]);
  useSave && useSave();
  updateHUD(); sync3D();
  if (wasRoad || !p.locationId) goHome();
  else afterRoom(LOCATIONS[p.locationId]);
}

// ---------- help ----------
export function showHelp() {
  modal(`<b>🧟 HOW TO SURVIVE</b><br><br>
  · Explore → pick a location → search rooms. Each room costs <b>time</b>.<br>
  · <b>Night (20:00–06:00)</b>: +combat, −escape. Get home before dark.<br>
  · <b>Noise</b> attracts zombies. Heavy weapons & breaking doors are loud.<br>
  · <b>Sanity</b>: low = combat penalties, panic, hallucinations. Church + tea help.<br>
  · <b>Hunger/thirst</b> drain over time. Eat & drink.<br>
  · <b>Durability</b>: repair at the Forge. Broken weapons deal half damage.<br>
  · Wildlife: rabbits, deer, boars, dogs, rats, crows. Hunt for <b>raw meat</b> — cook it at a campfire, or risk it raw. Sell hides & surplus at the Merchant.<br>
  · Locked rooms need a <b>lockpick</b> or <b>crowbar</b>.<br>
  · Searched rooms go dry — then you can <b>push deeper</b> at rising danger.<br>
  · Gathering (nearby deadfall, trees, rock faces) shares <b>3 charges/day</b> — trees give +6 with axe, +2 by hand.<br>
  · Drag the 3D view to orbit, wheel/pinch to zoom. Game works without 3D too.`,
    [{ label: 'Got it' }]);
}

export function rerender() {
  updateHUD(); sync3D();
  // re-arm current screen without log spam
  if (screen === 'settlement') showSettlement(false, true);
  else if (screen === 'nowhere') showNowhere(false, true);
  else if (screen === 'explore' && P().locationId) showExplore(P().locationId, true);
  else if (screen === 'build') showBuild(true);
}
function showSettlementRefresh() {
  showSettlement(false, true);
}

export { showSettlement, updateHUD, sync3D };
