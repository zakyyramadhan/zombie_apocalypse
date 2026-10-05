// Bootstrap. No game logic here.
import { freshState, saveGame, loadGame, hasSave } from './state.js';
import { bindState, showCamp, updateHUD, sync3D, showHelp } from './ui.js';
import './three-scene.js';

let S = freshState();

function persist() { saveGame(S); }

function boot() {
  const canvas = document.getElementById('scene');
  let ok3d = false;
  try { ok3d = window.ZScene.init(canvas); } catch (e) { console.warn('3D init failed', e); }
  if (!ok3d) document.getElementById('scene-fallback').classList.remove('hidden');
  else { try { window.ZScene.loadModels(); } catch (e) { console.warn('model load failed', e); } }

  // restore?
  if (hasSave()) {
    const data = loadGame();
    if (data && !data.legacy && data.player) {
      S = { player: data.player, weather: data.weather || 'clear', merchantDay: data.merchantDay || 1, world: data.world || { depleted: {} } };
    }
  }
  bindState(S, persist);

  document.getElementById('btn-save').onclick = () => { persist(); toast('Saved.'); };
  document.getElementById('btn-load').onclick = () => {
    const d = loadGame();
    if (d && d.player) { S.player = d.player; S.weather = d.weather; S.world = d.world; bindState(S, persist); showCamp(); toast('Loaded.'); }
    else toast('No valid save.');
  };
  document.getElementById('btn-new').onclick = () => {
    if (confirm('Abandon this run and start over?')) { S = freshState(); bindState(S, persist); persist(); showCamp(true); }
  };
  document.getElementById('btn-help').onclick = showHelp;

  if (location.protocol === 'file:') {
    console.warn('Opened via file:// — ES modules + CDN need http. Run: npx serve .');
  }
  showCamp(true);
  updateHUD(); sync3D();
}

function toast(msg) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.className = 'sys';
  div.textContent = `— ${msg} —`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
