// Versioned save in localStorage. Robust against corruption.
import { SAVE_VERSION, WEAPONS } from './data.js';
import { newPlayer, normalizeInv } from './systems.js';

const KEY = 'zombie_survival_save_v1';
const META = 'zombie_survival_meta_v1';

export function saveGame(state) {
  try {
    const payload = { save_version: SAVE_VERSION, savedAt: Date.now(), player: state.player, weather: state.weather, merchantDay: state.merchantDay, world: state.world };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.save_version === 1 && data.player) {
      // migrate v1 → v2: base-building fields
      Object.assign(data.player, {
        base: data.player.base ?? null,
        siteFound: data.player.siteFound ?? true, // v1 players already had a camp
        baseStorage: data.player.baseStorage ?? 0,
        thirstSaver: data.player.thirstSaver ?? false,
        lastGardenDay: 0, lastWaterDay: 0,
      });
      if (data.player.siteFound && !data.player.base) {
        // v1 camp → treat as pre-built core so nothing is lost
        data.player.base = { site: 'forest_edge', structures: ['campfire','lean_to','workshop','trading_post','shrine'], foundedDay: 1 };
      }
      data.save_version = 2;
    }
    if (data.save_version === 2 && data.player) {
      // migrate v2 → v3: survival-not-RPG — strip levels/skills/charm
      delete data.player.xp; delete data.player.level;
      delete data.player.skillPts; delete data.player.skills;
      if (data.player.accessoryId === 'lucky_charm') data.player.accessoryId = 'none';
      data.save_version = 3;
    }
    if (data.save_version === 3 && data.player) {
      // migrate v3 → v4: axe/pickaxe are belt tools now, not weapons
      data.player.tools ??= {};
      data.player.toolId ??= 'none';
      if (data.player.weaponId === 'fire_axe' || data.player.weaponId === 'pickaxe') {
        data.player.tools[data.player.weaponId] = true;
        data.player.toolId = data.player.weaponId;
        data.player.weaponId = 'kitchen_knife';
        data.player.weaponDura = WEAPONS.kitchen_knife.durability;
      }
      data.save_version = SAVE_VERSION;
    }
    if (data.save_version !== SAVE_VERSION) return { legacy: true, data };
    if (!data.player || typeof data.player.hp !== 'number') return null;
    data.player.searched ??= {};
    data.player.deep ??= 0;
    data.player.gatherLeft ??= 3;
    data.player.gatherDay ??= 0;
    data.player.gardenCrop ??= null;
    data.player.tools ??= {};
    data.player.toolId ??= 'none';
    data.player.owned ??= {}; // found/forged gear waits in the bag until equipped
    data.player.locked ??= {}; // stacks protected from being dropped
    normalizeInv(data.player); // heal display-name keys, whatever their source
    if (data.player.base) {
      data.player.base.stash ??= {};
      data.player.base.stashLv ??= 1;
      // shed rework: pre-built sheds upgrade from +8 to +12 (shed is its only source)
      if (data.player.base.structures?.includes('storage_shed') && (data.player.baseStorage || 0) <= 8) {
        data.player.baseStorage = 12;
      }
    }
    data.world ??= { depleted: {} };
    data.world.cooldown ??= {};
    return data;
  } catch { return null; } // corrupted -> null, never crash
}

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function wipeSave() { try { localStorage.removeItem(KEY); } catch {} }

export function freshState() {
  return { player: newPlayer(), weather: 'clear', merchantDay: 1, world: { depleted: {}, hordeDays: [], cooldown: {} } };
}

export function recordDeath(player, score) {
  try {
    const meta = JSON.parse(localStorage.getItem(META) || '{}');
    meta.runs = (meta.runs || 0) + 1;
    meta.bestScore = Math.max(meta.bestScore || 0, score);
    meta.totalKills = (meta.totalKills || 0) + player.kills;
    meta.bestDay = Math.max(meta.bestDay || 0, player.day);
    localStorage.setItem(META, JSON.stringify(meta));
    return meta;
  } catch { return {}; }
}
export function getMeta() { try { return JSON.parse(localStorage.getItem(META) || '{}'); } catch { return {}; } }
