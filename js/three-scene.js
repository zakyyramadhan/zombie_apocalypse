// Three.js visualization ONLY. No game balance numbers here.
// Exposes window.ZScene with the contract from AGENT.md §47.2,
// plus setBase(structIds) — the camp visibly grows as you build it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// External character models (dropped into assets/ by the developer).
// Missing/corrupt files NEVER break the game — procedural capsules stay.
// Clip names here must match the animation names inside the GLB files.
const MODELS = {
  player: { path: 'assets/player.glb', height: 1.8, clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', die: 'Die' } },
  zombie: { path: 'assets/zombie.glb', height: 1.9, clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', die: 'Die' } },
};
const loaded = { player: null, zombie: null }; // { root, clips: Map<name, AnimationClip> }
let gltfLoader = null;
let playerAnim = null; // { mixer, clips, current, action } — null while procedural

let renderer, scene, camera, sun, moon, moonMesh, hemi, ground, fireLight, flame;
let actors = [];   // zombies {group, armL, armR}
let props = [];    // location group children (lights + meshes)
let lootMeshes = [];
let smokes = [];  // {pts, vel, life, max}
let stars = null;
let windowMats = [];
let rain = null, rainVel = null;
let mode = 'settlement';
let baseStructs = [];
let camTheta = 0.6, camPhi = 1.0, camDist = 16;
let wantTheta = 0.6, wantPhi = 1.0, wantDist = 16;
let shakeT = 0;
let tweens = [];
let dragging = false, px = 0, py = 0, pinchD = 0;
let player = null, playerLight = null;
let t = 0, nightF = 0;
let ok = false;
const isMobile = (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || window.innerWidth < 820;

const SKY = {
  day: new THREE.Color(0x87a5b8), dusk: new THREE.Color(0x4a3b52),
  night: new THREE.Color(0x060a14),
};

function mat(c, e = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.05, emissive: c, emissiveIntensity: e }); }
function noShadow(m) { m.userData.noShadow = true; return m; }

function box(w, h, d, c, x = 0, y = 0, z = 0, e = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, e));
  m.position.set(x, y, z);
  return m;
}
function cyl(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y, z);
  return m;
}

// ---------- characters ----------
// Built from primitives glued into joint-pivoted Groups, so the existing swing
// code (armL.rotation.x = …) rotates from the shoulder/hip instead of from the
// middle of the limb. front = -z, soles on y = 0.
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

function capsule(r, len, c, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, seg), mat(c));
  m.position.set(x, y, z);
  return m;
}

// two-segment limb + joint sphere; the Group origin IS the joint
function limb(r1, l1, r2, l2, c, o = {}) {
  const g = new THREE.Group();
  const jr = o.joint ?? r2 * 1.15;
  const yTop = -(l1 / 2 + r1 * 0.3);
  g.add(capsule(r1, l1, c, 0, yTop, 0));
  const j = new THREE.Mesh(new THREE.SphereGeometry(jr, 8, 6), mat(c));
  j.position.y = yTop - (l1 / 2 + r1 * 0.3) - jr * 0.5;
  g.add(j);
  const yEnd = j.position.y - jr * 0.5 - (l2 / 2 + r2 * 0.3);
  g.add(capsule(r2, l2, c, 0, yEnd, 0));
  if (o.foot) g.add(box(o.foot.w, o.foot.h, o.foot.d, o.foot.c, 0, yEnd - (l2 / 2 + r2 * 0.3) - o.foot.h / 2, -0.05));
  if (o.hand) g.add(box(o.hand.w, o.hand.h, o.hand.d, o.hand.c, 0, yEnd - (l2 / 2 + r2 * 0.3) - o.hand.h / 2, 0));
  return g;
}

function headMesh(skin, hair, r, eyeColor = 0x1a1a1a, eyeR = 0.032) {
  const g = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(skin));
  skull.scale.y = 1.1;
  g.add(skull);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), mat(hair)));
  const eyeM = new THREE.MeshBasicMaterial({ color: eyeColor });
  for (const sx of [-r * 0.42, r * 0.42]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 6, 6), eyeM);
    e.position.set(sx, r * 0.05, -r * 0.94);
    g.add(noShadow(e));
  }
  return g;
}

function makePerson({ jacket = 0x3f6fb5, skin = 0xd8c39a, pack = true, weapon = true } = {}) {
  const g = new THREE.Group();
  const pants = 0x33415c, boot = 0x2a2118;
  // legs — hip y 0.885 puts the soles on y = 0 for the 1.8 target height
  const legL = limb(0.098, 0.30, 0.08, 0.28, pants, { foot: { w: 0.14, h: 0.11, d: 0.28, c: boot } });
  legL.position.set(-0.115, 0.885, 0);
  const legR = legL.clone();
  legR.position.x = 0.115;
  g.add(legL, legR);
  g.add(box(0.36, 0.20, 0.23, pants, 0, 0.97, 0));                      // pelvis
  g.add(box(0.40, 0.06, 0.25, 0x24262b, 0, 1.08, 0));                   // belt
  g.add(box(0.36, 0.20, 0.23, jacket, 0, 1.22, 0));                     // abdomen
  g.add(box(0.44, 0.34, 0.26, jacket, 0, 1.42, 0));                     // chest
  g.add(box(0.16, 0.20, 0.02, shade(jacket, 1.35), 0, 1.46, -0.14));    // V-neck
  g.add(cyl(0.062, 0.062, 0.12, skin, 0, 1.53, 0));                     // neck
  const head = headMesh(skin, 0x2f2419, 0.15);
  head.position.y = 1.635;
  g.add(head);
  const armL = limb(0.072, 0.22, 0.062, 0.22, jacket, { joint: 0.072, hand: { w: 0.10, h: 0.13, d: 0.11, c: skin } });
  armL.position.set(-0.245, 1.48, 0);
  const armR = limb(0.072, 0.22, 0.062, 0.22, jacket, { joint: 0.072, hand: { w: 0.10, h: 0.13, d: 0.11, c: skin } });
  armR.position.set(0.245, 1.48, 0);
  g.add(armL, armR);
  for (const sx of [-0.245, 0.245]) {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.086, 8, 6), mat(jacket)).translateX(sx).translateY(1.48));
  }
  if (weapon) {
    const w = box(0.07, 0.07, 0.62, 0x8a6b45, 0, -0.68, -0.34);
    w.rotation.x = -0.5;
    armR.add(w);                                                        // swings with the arm
  }
  if (pack) g.add(box(0.38, 0.50, 0.20, 0x5d4c30, 0, 1.30, 0.24));
  g.userData = { armL, armR, legL, legR };
  return g;
}

function makeZombie(colorHex) {
  const g = new THREE.Group();
  const skin = 0x9aa884, dark = shade(colorHex, 0.72);
  const legL = limb(0.104, 0.32, 0.084, 0.30, dark, { foot: { w: 0.145, h: 0.11, d: 0.29, c: 0x241d16 } });
  legL.position.set(-0.12, 0.94, 0);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legL, legR);
  g.add(box(0.38, 0.20, 0.24, dark, 0, 1.02, 0));                       // pelvis
  // chest is a box, not a capsule: a capsule is only ~0.15 wide at shoulder
  // height, which leaves a visible gap between the torso and the arms.
  g.add(box(0.38, 0.22, 0.25, colorHex, 0, 1.18, 0));                   // abdomen
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.16, 3, 10), mat(colorHex));
  torso.position.set(0, 1.40, 0);
  torso.name = 'zbody';
  g.add(torso);
  g.add(box(0.20, 0.26, 0.03, shade(colorHex, 0.62), 0, 1.36, -0.22));  // torn front
  g.add(cyl(0.07, 0.07, 0.10, skin, 0, 1.58, 0));                       // neck
  const head = headMesh(skin, shade(colorHex, 0.5), 0.16, 0xff2222, 0.042);
  head.position.set(0, 1.724, -0.03);
  head.rotation.z = 0.16;
  g.add(head);
  g.add(box(0.11, 0.05, 0.04, 0x5a2b28, 0, 1.68, -0.14));               // slack jaw
  const armL = limb(0.078, 0.26, 0.065, 0.24, skin, { joint: 0.078, hand: { w: 0.115, h: 0.13, d: 0.10, c: skin } });
  armL.position.set(-0.27, 1.56, 0);
  const armR = limb(0.078, 0.26, 0.065, 0.24, skin, { joint: 0.078, hand: { w: 0.115, h: 0.13, d: 0.10, c: skin } });
  armR.position.set(0.27, 1.56, 0);
  g.add(armL, armR);
  for (const sx of [-0.27, 0.27]) {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(colorHex)).translateX(sx).translateY(1.56));
  }
  g.userData = { armL, armR, legL, legR, phase: Math.random() * 10 };
  g.rotation.x = -0.05;  // ponytail: fixed hunch; the death fall-over overwrites rotation.x anyway
  return g;
}

// ---------- external GLB models (optional; procedural fallback always works) ----------
function wrapModel(key, gltf) {
  const cfg = MODELS[key];
  const outer = new THREE.Group();
  const root = gltf.scene;
  // normalize to target height, feet on y=0 regardless of authoring scale
  const bbox = new THREE.Box3().setFromObject(root);
  const h = Math.max(0.001, bbox.max.y - bbox.min.y);
  root.scale.setScalar(cfg.height / h);
  const b2 = new THREE.Box3().setFromObject(root);
  root.position.y -= b2.min.y;
  outer.add(root);
  outer.userData.gltf = true;
  const clips = new Map();
  for (const c of gltf.animations || []) clips.set(c.name, c);
  return { outer, clips };
}
function makeMixerRec(group, clips) {
  if (!clips || clips.size === 0) return null;
  return { mixer: new THREE.AnimationMixer(group), clips, current: null, action: null };
}
function playClip(rec, name, once = false) {
  if (!rec || !rec.mixer || !rec.clips) return false;
  const clip = rec.clips.get(name);
  if (!clip) return false;
  if (rec.current === name && !once) return true;
  try {
    if (rec.action) rec.action.stop();
    rec.action = rec.mixer.clipAction(clip);
    rec.action.reset();
    if (once) {
      rec.action.setLoop(THREE.LoopOnce, 1);
      rec.action.clampWhenFinished = true;
    } else {
      rec.action.setLoop(THREE.LoopRepeat, Infinity);
    }
    rec.action.play();
    rec.current = once ? null : name; // one-shots don't own the state
    return true;
  } catch { return false; }
}
// one-shot clip, then back to the base loop (walk in combat, idle outside)
function playOnce(rec, clipName, baseName) {
  if (!playClip(rec, clipName, true)) return;
  const clip = rec.clips.get(clipName);
  const ms = Math.min(2000, Math.max(300, (clip && clip.duration ? clip.duration : 0.6) * 1000));
  setTimeout(() => { if (!rec.dead) playClip(rec, baseName); }, ms);
}
function baseClip() { return mode === 'combat' ? MODELS.zombie.clips.walk : MODELS.zombie.clips.idle; }
// tint a loaded zombie toward its type color (clone first — never tint shared mats)
function tintZombie(group, colorHex) {
  const tint = new THREE.Color(colorHex);
  const white = new THREE.Color(0xffffff);
  group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    if (!o.material.color) return;
    if (o.material.map) o.material.color.copy(white).lerp(tint, 0.25);
    else o.material.color.copy(tint).lerp(white, 0.35);
  });
}
// red hit-flash on every emissive material in the group (both model kinds)
function flashGroup(group) {
  const mats = [];
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) {
      if (o.material._flashSaved !== true) {
        o.material._flashSaved = true;
        o.material.userData._e = o.material.emissive.getHex();
        o.material.userData._ei = o.material.emissiveIntensity;
      }
      mats.push(o.material);
    }
  });
  for (const m of mats) { m.emissive.setHex(0xff3333); m.emissiveIntensity = 0.9; }
  setTimeout(() => {
    for (const m of mats) {
      m.emissive.setHex(m.userData._e ?? 0x000000);
      m.emissiveIntensity = m.userData._ei ?? 0;
    }
  }, 180);
}
function loadOne(key) {
  const cfg = MODELS[key];
  return new Promise((resolve) => {
    try {
      gltfLoader = gltfLoader || new GLTFLoader();
      gltfLoader.load(cfg.path,
        (gltf) => {
          try { resolve(wrapModel(key, gltf)); }
          catch (e) { console.warn(`[models] ${cfg.path} unusable, procedural fallback`, e); resolve(null); }
        },
        undefined,
        () => { console.warn(`[models] missing ${cfg.path} — procedural fallback`); resolve(null); });
    } catch (e) { console.warn(`[models] loader failed for ${cfg.path}`, e); resolve(null); }
  });
}
function swapPlayer(model) {
  if (!ok || !model) return;
  scene.remove(player);
  player = model.outer;
  player.position.set(0, 0, 2);
  player.rotation.y = Math.PI; // face -z, same convention as the capsule
  scene.add(player);
  playerAnim = makeMixerRec(player, model.clips);
  playClip(playerAnim, MODELS.player.clips.idle);
  applyShadows();
}

// ---------- nature / props ----------
// Procedural dirt map (no asset files). Keep the ground's own tone here and
// let the material colour stay white, otherwise the map gets multiplied dark.
function groundTexture() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#151a20';                     // slightly under 0x1a2027: the speckle lifts it back
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 6000; i++) {             // fine grain dominates -> tiling stays invisible
    const v = 0.62 + Math.random() * 0.5;
    g.fillStyle = `rgba(${(22 * v) | 0},${(27 * v) | 0},${(33 * v) | 0},0.8)`;
    g.fillRect(Math.random() * N, Math.random() * N, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  for (let i = 0; i < 40; i++) {               // faint large patches, low alpha on purpose
    g.fillStyle = `rgba(${12 + Math.random() * 30 | 0},${17 + Math.random() * 30 | 0},${22 + Math.random() * 30 | 0},0.22)`;
    const r = 10 + Math.random() * 34;
    g.beginPath();
    g.ellipse(Math.random() * N, Math.random() * N, r, r * 0.6, Math.random() * 3, 0, 6.3);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 12);                        // 7.5 world units per tile
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tree(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.14 * s, 0.2 * s, 1.6 * s, 0x4a3826, 0, 0.8 * s, 0));
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 2.2 * s, 8), mat(0x2f4a2a));
  f1.position.y = 2.2 * s; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.8 * s, 1.6 * s, 8), mat(0x38572f));
  f2.position.y = 3.1 * s; g.add(f2);
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * 6;
  return g;
}
function rock(x, z, s = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), mat(0x5a6068));
  m.position.set(x, 0.3 * s, z);
  m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  m.scale.y = 0.7;
  return m;
}
function grassTuft(x, z) {
  const s = 0.7 + Math.random() * 0.7;
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.2 * s, 5), mat(0x1a2a15));
  base.position.y = 0.1 * s;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075 * s, 0.42 * s, 5),
    mat(Math.random() < 0.5 ? 0x314a28 : 0x28401e));
  tip.position.y = 0.3 * s;
  g.add(base, tip);
  g.position.set(x, 0, z);
  // slight lean + noShadow removed so the tuft anchors with a real contact shadow
  g.rotation.set((Math.random() - 0.5) * 0.24, Math.random() * 3, (Math.random() - 0.5) * 0.24);
  return g;
}
function glowWindow(w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc861, emissiveIntensity: 0.05 }));
  m.position.set(x, y, z); m.rotation.y = ry;
  noShadow(m);
  windowMats.push(m.material);
  return m;
}
function spawnSmoke(x, y, z, scale = 1, dark = 0x555555) {
  const n = isMobile ? 10 : 22;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = x + (Math.random() - 0.5) * scale;
    pos[i * 3 + 1] = y + Math.random() * 2;
    pos[i * 3 + 2] = z + (Math.random() - 0.5) * scale;
    vel[i] = 0.5 + Math.random() * 0.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: dark, size: 0.5 * scale, transparent: true, opacity: 0.45 });
  const pts = new THREE.Points(geo, m);
  noShadow(pts);
  scene.add(pts);
  smokes.push({ pts, vel, life: 0, max: 14, x, y, z, scale });
}

// ---------- camp structures ----------
function buildCampfire(full) {
  const g = new THREE.Group();
  // irregular ring — a perfect circle of identical rocks reads as a prop, not a fire pit
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + Math.random() * 0.18;
    const r = 0.80 + Math.random() * 0.22;
    g.add(rock(Math.cos(a) * r, Math.sin(a) * r, 0.26 + Math.random() * 0.2));
  }
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 0.12, 10), mat(0x4a4a50));
  ash.position.y = 0.06; g.add(ash);
  // firewood: two laid logs, then three leaning into a teepee with charred inner ends.
  // The camera is top-down, so the flame cone hides anything directly under it —
  // the teepee ring has to sit OUTSIDE the flame radius (0.30) to be visible at all.
  g.add(box(0.96, 0.15, 0.16, 0x3a2a1a, 0, 0.12, 0.08));
  const l2 = box(0.16, 0.15, 0.84, 0x2f2216, 0.06, 0.16, 0);
  l2.rotation.y = 0.3; g.add(l2);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const rx = -Math.sin(a) * 0.42, rz = Math.cos(a) * 0.42;
    const log = cyl(0.065, 0.08, 0.82, 0x453322, 0, 0, 0, 6);
    log.position.set(Math.cos(a) * 0.44, 0.37, Math.sin(a) * 0.44);
    log.rotation.set(rx, 0, rz); g.add(log);
    const char = cyl(0.07, 0.05, 0.2, 0x1b1512, 0, 0, 0, 6);
    char.position.set(Math.cos(a) * 0.28, 0.68, Math.sin(a) * 0.28);
    char.rotation.set(rx, 0, rz); g.add(char);
  }
  if (full) {
    flame = new THREE.Group();
    const cone = (r, h, c, y) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), new THREE.MeshBasicMaterial({ color: c }));
      m.position.y = y; noShadow(m); flame.add(m);
    };
    // each inner cone must be TALLER than the one outside it, or it never shows
    cone(0.30, 0.95, 0xff5f14, 0.62);
    cone(0.19, 1.15, 0xffab2e, 0.72);
    cone(0.10, 1.30, 0xffe9a8, 0.80);
    g.add(flame);
    const li = new THREE.PointLight(0xff8833, 20, 13);
    li.position.set(0, 1.2, 0); g.add(li);
    fireLight = li;
  } else {
    fireLight = null; flame = null;
  }
  return g;
}

// gable roof: two slabs meeting at a ridge, with a shaded underside + ridge cap.
// Exact slab length (hypot) so the ridge meets the eaves at any rise.
function pitchedRoof(w, d, y, c, rise = 0.8, ov = 0.28) {
  const g = new THREE.Group();
  const dark = new THREE.Color(c).multiplyScalar(0.6).getHex();
  const half = d / 2 + ov, len = Math.hypot(rise, half), a = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    const zc = (s * half) / 2;
    const slab = box(w + ov * 2, 0.12, len, c, 0, y + rise / 2, zc);
    slab.rotation.x = s * a;
    const under = box(w + ov * 2 - 0.14, 0.06, len - 0.14, dark, 0, y + rise / 2 - 0.09, zc);
    under.rotation.x = s * a;
    g.add(slab, under);
  }
  g.add(box(w + ov * 2 + 0.14, 0.16, 0.26, dark, 0, y + rise + 0.02, 0));
  return g;
}
function structMesh(id) {
  const g = new THREE.Group();
  if (id === 'lean_to') {
    const wood = 0x4a3826, cloth = 0x6d7a58;
    g.add(box(3.0, 2.3, 0.14, wood, 0, 1.15, -1.25));                     // back wall
    for (const sx of [-1.45, 1.45]) g.add(box(0.14, 2.0, 2.4, 0x41301f, sx, 1.0, -0.1));
    for (const sx of [-1.5, 1.5]) g.add(cyl(0.09, 0.11, 1.9, wood, sx, 0.95, 1.15));
    const roof = box(3.5, 0.13, 3.1, cloth, 0, 2.2, -0.05);
    roof.rotation.x = -0.18; g.add(roof);
    g.add(box(3.5, 0.26, 0.1, new THREE.Color(cloth).multiplyScalar(0.55).getHex(), 0, 1.94, 1.5));
    g.add(box(1.1, 0.14, 0.6, 0x2a2419, 0, 0.07, -1.0));                  // mat
    g.add(box(1.5, 0.22, 0.85, 0x6b5a4f, 0, 0.11, 0.35));                 // bedroll
    g.add(box(0.44, 0.24, 0.66, 0x8a8578, 0, 0.12, 0.92));                // pillow
    g.add(box(0.5, 0.5, 0.5, 0x7a6238, 1.05, 0.25, 0.85));                // crate
  } else if (id === 'workshop') {
    g.add(box(2.6, 0.25, 1.2, 0x6b5236, 0, 0.9, 0)); // bench
    for (const [sx, sz] of [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]])
      g.add(box(0.18, 0.9, 0.18, 0x4a3826, sx, 0.45, sz));
    g.add(box(0.7, 0.5, 0.5, 0x3a3f45, 0.6, 1.25, 0)); // anvil-ish
    for (const sx of [-1.4, 1.4]) g.add(cyl(0.09, 0.09, 2.6, 0x4a3826, sx, 1.3, 0));
    g.add(pitchedRoof(3.4, 2.6, 2.52, 0x54432e, 0.8));                    // was a flat slab
    const forgeGlow = new THREE.PointLight(0xff7733, 8, 8);
    forgeGlow.position.set(0, 1.2, 0); g.add(forgeGlow);
  } else if (id === 'trading_post') {
    g.add(box(2.6, 1.1, 1.4, 0x6b4f3a, 0, 0.55, 0));                      // counter
    g.add(box(2.75, 0.1, 1.55, 0x54402c, 0, 1.14, 0));                    // counter top
    for (const sx of [-1.35, 1.35]) g.add(cyl(0.07, 0.09, 2.3, 0x4a3826, sx, 1.15, 0.8));
    for (let i = 0; i < 5; i++) {                                          // striped canvas awning
      const s = box(0.64, 0.1, 2.3, i % 2 ? 0x8f3b3b : 0xc4b49a, -1.28 + i * 0.64, 2.1, -0.1);
      s.rotation.x = -0.2; g.add(s);
    }
    g.add(box(0.8, 0.8, 0.8, 0x7a6238, 1.85, 0.4, 0.45));                 // crates
    g.add(box(0.6, 0.6, 0.6, 0x7a6238, 1.75, 1.1, 0.35));
  } else if (id === 'shrine') {
    g.add(box(2.2, 0.3, 2.2, 0x8a8578, 0, 0.15, 0));
    g.add(box(0.5, 1.8, 0.5, 0xcfc8b8, 0, 1.1, -0.5));
    g.add(box(1.0, 0.22, 0.22, 0xcfc8b8, 0, 1.7, -0.5));
    const candle = new THREE.PointLight(0xffd76a, 5, 6);
    candle.position.set(0, 1, 0.5); g.add(candle);
    g.add(box(0.5, 0.3, 0.3, 0xe8d27a, -0.4, 0.45, 0.5, 0.4));
  } else if (id === 'garden') {
    for (let r = 0; r < 3; r++) {
      g.add(box(2.6, 0.18, 0.5, 0x3a2c1c, 0, 0.09, -0.8 + r * 0.8));
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), mat(0x4f8f3a));
        s.position.set(-1 + i * 0.5, 0.35, -0.8 + r * 0.8);
        noShadow(s); g.add(s);
      }
    }
  } else if (id === 'rain_collector') {
    g.add(cyl(0.55, 0.55, 1.1, 0x3f6f8f, 0, 0.55, 0));
    g.add(cyl(0.75, 0.4, 0.5, 0x5a6b7a, 0, 1.35, 0));
    for (const sx of [-0.5, 0.5]) g.add(cyl(0.06, 0.06, 1.6, 0x4a3826, sx, 0.8, 0));
  } else if (id === 'storage_shed') {
    g.add(box(2.6, 1.8, 2.2, 0x5a4a36, 0, 0.9, 0));                       // walls
    g.add(box(0.9, 1.4, 0.1, 0x33281c, 0, 0.7, -1.12));                   // door
    g.add(box(0.07, 0.07, 0.18, 0x8a8578, 0.34, 0.78, -1.18));            // handle
    g.add(pitchedRoof(2.72, 2.3, 1.78, 0x3e3226, 0.7));
    g.add(box(0.7, 0.7, 0.7, 0x7a6238, 1.8, 0.35, 0.6));
  } else if (id === 'supply_stash') {
    g.add(box(1.4, 0.5, 1.0, 0x4f3d28, 0, 0.25, 0)); // buried crate
    g.add(box(1.5, 0.12, 1.1, 0x6b5236, 0, 0.55, 0)); // lid
    g.add(box(0.5, 0.5, 0.5, 0x7a6238, 1.0, 0.25, 0.3)); // side sack
  } else if (id === 'palisade') {
    // 16 posts over a 2*pi*11 ring = 4.3 units apart, which reads as scattered
    // spikes, not a fence. 120 brings the gap under the post diameter.
    // ponytail: 240 plain meshes; swap to InstancedMesh if the mobile frame budget hurts
    const N = 120;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const h = 2.4 + (i % 3) * 0.18;
      const x = Math.cos(a) * 11, z = Math.sin(a) * 11 - 2;
      g.add(cyl(0.19, 0.21, h, 0x4f3d28, x, h / 2, z));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 6), mat(0x3b2d1d));
      cap.position.set(x, h + 0.17, z); g.add(cap);
    }
    return g; // positioned at origin already
  } else if (id === 'watchtower') {
    for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]])
      g.add(box(0.22, 5, 0.22, 0x4f3d28, sx, 2.5, sz));
    g.add(box(2.4, 0.25, 2.4, 0x5a4a36, 0, 4.6, 0));
    g.add(box(2.2, 1.1, 2.2, 0x54432e, 0, 5.3, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1, 4), mat(0x3e3226));
    roof.position.y = 6.4; roof.rotation.y = Math.PI / 4; g.add(roof);
  }
  return g;
}

// ---------- location builders ----------
function clearDynamic() {
  for (const m of props) scene.remove(m);
  for (const m of lootMeshes) scene.remove(m);
  for (const a of actors) scene.remove(a.group || a);
  for (const s of smokes) { scene.remove(s.pts); }
  props = []; lootMeshes = []; actors = []; smokes = [];
  windowMats = []; fireLight = null; flame = null;
}
function scatterRubble(n, area = 24) {
  for (let i = 0; i < n; i++) {
    const r = box(0.3 + Math.random(), 0.2, 0.3 + Math.random(), 0x232b34,
      (Math.random() - 0.5) * area, 0.1, (Math.random() - 0.5) * area);
    scene.add(r); props.push(r);
  }
}
function scatterGrass(n, area = 30) {
  for (let i = 0; i < n; i++) {
    const m = grassTuft((Math.random() - 0.5) * area, (Math.random() - 0.5) * area);
    scene.add(m); props.push(m);
  }
}
function groundPatches() {
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2, 12),
      new THREE.MeshBasicMaterial({ color: 0x11161b, transparent: true, opacity: 0.5 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((Math.random() - 0.5) * 40, 0.01, (Math.random() - 0.5) * 40);
    noShadow(m);
    scene.add(m); props.push(m);
  }
}
function building(w, h, d, c, x, z, windows = true) {
  const g = new THREE.Group();
  g.add(box(w, h, d, c, 0, h / 2, 0));
  g.add(box(w + 0.4, 0.35, d + 0.4, 0x22262c, 0, h + 0.15, 0)); // roof lip
  if (windows) {
    for (const wx of [-w / 4, w / 4]) {
      g.add(glowWindow(0.7, 0.9, wx, h * 0.55, -d / 2 - 0.02, Math.PI));
      g.add(glowWindow(0.7, 0.9, wx, h * 0.55, d / 2 + 0.02, 0));
    }
  }
  g.position.set(x, 0, z);
  return g;
}

function buildSettlement() {
  clearDynamic();
  scatterGrass(60); groundPatches();
  const has = (id) => baseStructs.includes(id);
  const add = (m, x = 0, z = 0) => { m.position.x += x; m.position.z += z; scene.add(m); props.push(m); return m; };

  // campfire center (stones always; flame only when built)
  add(buildCampfire(has('campfire')), 0, -1);

  if (!has('campfire') && baseStructs.length === 0) {
    // nowhere: just a clearing with stones and dead trees
    add(tree(-6, -6, 0.8)); add(tree(7, -5, 1));
    add(rock(3, 3, 1.2)); add(rock(-4, 2, 0.8));
  }
  if (has('lean_to')) add(structMesh('lean_to'), -6, -3);
  if (has('workshop')) add(structMesh('workshop'), 8, 3);
  if (has('trading_post')) add(structMesh('trading_post'), 0, 5);
  if (has('shrine')) add(structMesh('shrine'), -8, 4);
  if (has('garden')) add(structMesh('garden'), 6, -5);
  if (has('rain_collector')) add(structMesh('rain_collector'), 3.5, 4.5);
  if (has('storage_shed')) add(structMesh('storage_shed'), -3.5, 6.5);
  if (has('supply_stash')) add(structMesh('supply_stash'), 3.5, -3.5);
  if (has('watchtower')) add(structMesh('watchtower'), 9, -6);
  if (has('palisade')) add(structMesh('palisade'), 0, 2);

  // trees at the edges for shelter feel
  add(tree(-13, -9, 1.1)); add(tree(13, -10, 0.9)); add(tree(-12, 8, 1));
}

function buildExplore(id) {
  clearDynamic();
  groundPatches();
  const add = (m) => { scene.add(m); props.push(m); return m; };
  if (id === 'supermarket') {
    scatterRubble(14); scatterGrass(8);
    add(building(12, 4, 8, 0x39424c, 0, -8));
    add(box(12.5, 0.8, 8.5, 0x7a2e2e, 0, 4.2, -8, 0.15));
    for (let i = -2; i <= 2; i++) add(box(0.8, 2.2, 3, 0x2c343d, i * 2, 1.1, -6));
    add(box(2, 2.5, 0.3, 0x14181d, -3, 1.25, -3.8));
    for (let i = 0; i < 5; i++) add(rock((Math.random() - 0.5) * 20, 3 + Math.random() * 5, 0.5));
  } else if (id === 'residential') {
    scatterGrass(20); scatterRubble(8);
    for (const [x, z, c] of [[-7, -7, 0x5a6b7a], [7, -8, 0x6b5a6b], [0, -12, 0x4f5f6b]])
      add(building(5, 3, 4.5, c, x, z));
    for (let i = 0; i < 8; i++) add(box(0.25, 1 + Math.random(), 0.25, 0x2f3a2a, (Math.random() - 0.5) * 20, 0.5, 2 + Math.random() * 6));
    add(tree(-11, 3, 1)); add(tree(12, 4, 0.9));
  } else if (id === 'gas_station') {
    scatterRubble(12);
    add(building(6, 3, 5, 0x6b6257, 0, -9));
    add(box(10, 0.5, 8, 0x3a3f45, 0, 4.5, -5));
    for (const x of [-3, 0, 3]) {
      add(box(0.4, 2.2, 0.4, 0x888f96, x, 1.1, -5));
      add(box(1, 1.4, 0.7, 0x8f2e2e, x, 0.7, -5, 0.1));
    }
    add(box(2.2, 1.4, 4, 0x37414c, 7, 0.7, -2));
  } else if (id === 'forest') {
    scatterGrass(30);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 16;
      add(tree(Math.cos(a) * r, Math.sin(a) * r - 4, 0.8 + Math.random() * 0.8));
    }
    add(building(3.5, 2.6, 3, 0x5a4a36, -4, -8)); // ranger cabin
    add(box(1.6, 0.2, 1.6, 0x4f3d28, 5, 3.2, -9)); // hunter stand platform
    for (const sx of [4.4, 5.6]) add(cyl(0.09, 0.09, 3.2, 0x4a3826, sx, 1.6, -9));
  } else if (id === 'quarry') {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 18;
      add(rock(Math.cos(a) * r, Math.sin(a) * r - 4, 0.8 + Math.random() * 1.6));
    }
    add(box(10, 5, 1.5, 0x4a4f55, -6, 2.5, -13)); // terraced wall
    add(box(8, 3.5, 1.5, 0x555a61, 6, 1.75, -14));
    add(box(3, 1.6, 2, 0x7a5a22, 3, 0.8, -4)); // crusher machine
    add(building(3, 2.4, 2.6, 0x5f6a72, -6, -5)); // foreman office
  } else if (id === 'factory') {
    scatterRubble(10);
    add(building(14, 5, 9, 0x4a4f55, 0, -10));
    for (const x of [-4, 0, 4]) {
      add(cyl(0.7, 0.9, 9, 0x5a3a32, x, 4.5, -13)); // chimneys
      spawnSmoke(x, 8, -13, 1.2);
    }
    add(box(8, 1, 1.5, 0x3a3f45, -2, 0.5, -3)); // assembly line
    for (let i = 0; i < 4; i++) add(box(1.2, 1.2, 1.2, 0x6b6257, -5 + i * 2, 0.6, 4));
  } else if (id === 'farm') {
    scatterGrass(26);
    add(building(5, 3.2, 4, 0x8a4a3a, -5, -8)); // barn (red)
    add(building(4, 2.8, 3.6, 0xcfc4ae, 5, -9)); // farmhouse
    for (let i = 0; i < 8; i++) { // fences
      add(box(0.18, 1.1, 0.18, 0x5a4a36, -8 + i * 2, 0.55, 0));
    }
    add(box(14, 0.12, 0.12, 0x5a4a36, -1, 1.0, 0));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) { // crops
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6), mat(0x5f9f4a));
      s.position.set(-6 + i * 1.2, 0.25, 3 + r * 1.2);
      noShadow(s); add(s);
    }
    add(cyl(0.15, 0.15, 6, 0x6b6f75, 9, 3, -4)); // windmill mast
    add(box(1.6, 0.2, 0.1, 0x8a8f96, 9, 5.6, -4));
  } else {
    scatterRubble(20);
  }
  for (let i = 0; i < 5; i++)
    add(box(1 + Math.random(), 0.8 + Math.random(), 1, 0x232b34, (Math.random() - 0.5) * 24, 0.4, 2 + Math.random() * 8));
}

function applyShadows() {
  if (isMobile) return;
  scene.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow && o !== ground) { o.castShadow = true; }
  });
  ground.receiveShadow = true;
}

function tweenAxis(obj, axis, to, dur, delay = 0, onDone = null) {
  tweens.push({ obj, axis, from: obj.position[axis], to, t: -delay, dur, onDone });
}

function ensureRain(n) {
  if (rain) { scene.remove(rain); rain = null; }
  if (!n) return;
  const count = isMobile ? Math.floor(n / 2) : n;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  rainVel = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = Math.random() * 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    rainVel[i] = 12 + Math.random() * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x88aacc, size: 0.12, transparent: true, opacity: 0.7 }));
  noShadow(rain);
  scene.add(rain);
}

export const ZScene = {
  init(canvas) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
    } catch { return false; }
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    if (!isMobile) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    scene = new THREE.Scene();
    scene.background = SKY.day.clone();
    scene.fog = new THREE.Fog(0x2a3138, 12, 46);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);
    hemi = new THREE.HemisphereLight(0xbcd0dd, 0x20242a, 0.9);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    sun.position.set(10, 18, 6);
    if (!isMobile) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
      sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    }
    scene.add(sun);
    moon = new THREE.DirectionalLight(0x8fa8ff, 0);
    moon.position.set(-10, 18, -6);
    scene.add(moon);
    // moon disc
    moonMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0 }));
    moonMesh.position.set(-40, 45, -60);
    noShadow(moonMesh);
    scene.add(moonMesh);
    // stars
    {
      const n = 350, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.08;
        pos[i * 3] = Math.cos(a) * Math.cos(e) * 100;
        pos[i * 3 + 1] = Math.sin(e) * 100;
        pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 100;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.9, transparent: true, opacity: 0 }));
      noShadow(stars);
      scene.add(stars);
    }
    // ground
    ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({
      map: groundTexture(), roughness: 0.95, metalness: 0.03,
    }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // player
    player = makePerson({});
    player.position.set(0, 0, 2);
    player.rotation.y = Math.PI; // face -z (into the scene)
    scene.add(player);
    playerLight = new THREE.SpotLight(0xfff2c8, 0, 18, 0.6, 0.4);
    playerLight.position.set(0, 3, 2);
    scene.add(playerLight);

    const el = canvas;
    const resize = () => {
      const r = el.parentElement.getBoundingClientRect();
      const w = Math.max(50, r.width), h = Math.max(50, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    el.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; try { el.setPointerCapture(e.pointerId); } catch {} });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      wantTheta -= (e.clientX - px) * 0.005;
      wantPhi = Math.min(1.45, Math.max(0.35, wantPhi - (e.clientY - py) * 0.004));
      px = e.clientX; py = e.clientY;
    });
    el.addEventListener('pointerup', () => dragging = false);
    el.addEventListener('wheel', (e) => { e.preventDefault(); wantDist = Math.min(30, Math.max(7, wantDist + e.deltaY * 0.02)); }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchD) wantDist = Math.min(30, Math.max(7, wantDist + (pinchD - d) * 0.05));
        pinchD = d;
      }
    }, { passive: true });
    el.addEventListener('touchend', () => pinchD = 0);

    buildSettlement();
    applyShadows();
    ok = true;
    const loop = () => {
      requestAnimationFrame(loop);
      t += 0.016;
      if (scene.fog && scene.background) scene.fog.color.copy(scene.background); // kill the horizon seam
      if (fireLight) fireLight.intensity = 16 + Math.sin(t * 9) * 4 + Math.sin(t * 23) * 2;
      if (flame) {
        flame.scale.y = 1 + Math.sin(t * 11) * 0.15;
        flame.rotation.y += 0.05;
        if (Math.random() < 0.06) spawnSmoke(flame.parent.position.x, 1.2, flame.parent.position.z, 0.5, 0x333333);
      }
      if (playerAnim && playerAnim.mixer) playerAnim.mixer.update(0.016);
      if (player && !playerAnim) {
        player.position.y = Math.abs(Math.sin(t * 2)) * 0.06;
        const { armL, armR, legL, legR } = player.userData || {};
        if (armL && armR) {
          const swing = mode === 'combat' ? Math.sin(t * 7) * 0.5 : Math.sin(t * 2) * 0.08;
          armL.rotation.x = swing; armR.rotation.x = -swing;
          if (legL && legR) { legL.rotation.x = -swing; legR.rotation.x = swing; }
        }
      } else if (player && playerAnim) {
        player.position.y = 0; // GLB idle clip owns the motion
      }
      for (const z of actors) {
        const g = z.group;
        if (z.anim && z.anim.mixer) z.anim.mixer.update(0.016);
        if (z.glb) {
          g.position.y = 0;
          if (mode === 'combat' && !z.dead) {
            const dx = player.position.x - g.position.x, dz = player.position.z - g.position.z;
            const d = Math.hypot(dx, dz) || 1;
            if (d > 3.2) { g.position.x += (dx / d) * 0.008; g.position.z += (dz / d) * 0.008; }
            g.rotation.y = Math.atan2(dx, dz) + Math.PI;
          }
          continue; // skinned clips replace the procedural shamble
        }
        g.position.y = Math.abs(Math.sin(t * 3 + z.phase)) * 0.08;
        g.rotation.z = Math.sin(t * 2 + z.phase) * 0.08;
        // sign is +1.2 because the arms are now Groups pivoted at the shoulder:
        // a negative x-rotation would swing them backwards (front is -z).
        z.armL.rotation.x = 1.2 + Math.sin(t * 3 + z.phase) * 0.25;
        z.armR.rotation.x = 1.2 + Math.cos(t * 3 + z.phase) * 0.25;
        const ud = g.userData || {};
        if (ud.legL && ud.legR) {
          const ls = Math.sin(t * 3 + z.phase) * 0.24;
          ud.legL.rotation.x = ls; ud.legR.rotation.x = -ls;
        }
        if (mode === 'combat' && !z.dead) {
          const dx = player.position.x - g.position.x, dz = player.position.z - g.position.z;
          const d = Math.hypot(dx, dz) || 1;
          if (d > 3.2) { g.position.x += (dx / d) * 0.008; g.position.z += (dz / d) * 0.008; }
          g.rotation.y = Math.atan2(dx, dz) + Math.PI;
        }
      }
      for (const l of lootMeshes) { l.rotation.y += 0.03; l.position.y = 0.6 + Math.sin(t * 3 + l.position.x) * 0.15; }
      // smoke drift
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life += 0.016;
        const p = s.pts.geometry.attributes.position.array;
        for (let j = 0; j < s.vel.length; j++) {
          p[j * 3 + 1] += s.vel[j] * 0.016;
          p[j * 3] += Math.sin(t + j) * 0.004;
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
        s.pts.material.opacity = 0.45 * (1 - s.life / s.max);
        if (s.life > s.max) { scene.remove(s.pts); smokes.splice(i, 1); }
      }
      if (smokes.length > 12) { const s = smokes.shift(); scene.remove(s.pts); }
      if (rain) {
        const p = rain.geometry.attributes.position.array;
        for (let i = 0; i < rainVel.length; i++) {
          p[i * 3 + 1] -= rainVel[i] * 0.016;
          if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 20;
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
      // attack / intro tweens (ease-out cubic)
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += 0.016;
        if (tw.t < 0) continue;
        const k = Math.min(1, tw.t / tw.dur);
        const e = 1 - Math.pow(1 - k, 3);
        tw.obj.position[tw.axis] = tw.from + (tw.to - tw.from) * e;
        if (k >= 1) { tweens.splice(i, 1); tw.onDone && tw.onDone(); }
      }
      // camera drifts toward its target (swoops on combat start)
      camTheta += (wantTheta - camTheta) * 0.07;
      camPhi += (wantPhi - camPhi) * 0.07;
      camDist += (wantDist - camDist) * 0.07;
      const cx = player.position.x + Math.cos(camTheta) * Math.cos(camPhi) * camDist;
      const cz = player.position.z + Math.sin(camTheta) * Math.cos(camPhi) * camDist;
      const cy = Math.sin(camPhi) * camDist + 1;
      camera.position.set(cx, Math.max(2, cy), cz);
      if (shakeT > 0.01) {
        camera.position.x += (Math.random() - 0.5) * shakeT * 1.4;
        camera.position.y += (Math.random() - 0.5) * shakeT * 0.9;
        shakeT *= 0.90;
      } else shakeT = 0;
      camera.lookAt(player.position.x, 1.2, player.position.z - 2);
      renderer.render(scene, camera);
    };
    loop();
    return true;
  },

  setMode(m) {
    mode = m;
    if (m === 'combat') { wantDist = 12; wantTheta = 0.35; wantPhi = 0.62; } // low side view: face-off
    else { wantDist = 16; wantTheta = 0.6; wantPhi = 1.0; }
    const base = m === 'combat' ? 'walk' : 'idle';
    playClip(playerAnim, MODELS.player.clips[base]);
    for (const z of actors) {
      if (z.dead) continue;
      playClip(z.anim, z.glbBase || MODELS.zombie.clips[base]);
    }
  },
  setBase(ids) { baseStructs = ids || []; },
  badge(text) { const b = document.getElementById('scene-badge'); if (b) b.textContent = text; },

  buildLocation(id) {
    if (!ok) return;
    if (!id || id === 'settlement') buildSettlement();
    else buildExplore(id);
    applyShadows();
    if (player) player.position.set(0, 0, 2);
  },

  setDayTime(hour) {
    if (!ok) return;
    const night = hour >= 20 || hour < 6;
    const dusk = (hour >= 17 && hour < 20) || (hour >= 6 && hour < 8);
    const target = night ? SKY.night : dusk ? SKY.dusk : SKY.day;
    scene.background.lerp(target, 0.05);
    nightF += ((night ? 1 : 0) - nightF) * 0.05;
    sun.intensity += ((night ? 0.05 : 2.2) - sun.intensity) * 0.05;
    moon.intensity += ((night ? 0.7 : 0) - moon.intensity) * 0.05;
    hemi.intensity += ((night ? 0.25 : 0.9) - hemi.intensity) * 0.05;
    // fog colour is synced to scene.background every frame in the render loop
    if (stars) stars.material.opacity = nightF * 0.9;
    if (moonMesh) moonMesh.material.opacity = nightF;
    for (const m of windowMats) m.emissiveIntensity = 0.05 + nightF * 0.9;
    playerLight.intensity += ((night ? 60 : 0) - playerLight.intensity) * 0.1;
    playerLight.position.set(player.position.x, 3, player.position.z);
  },

  setWeather(w) {
    if (!ok) return;
    if (w === 'rain') { ensureRain(800); scene.fog.near = 8; scene.fog.far = 36; }
    else if (w === 'storm') { ensureRain(1400); scene.fog.near = 6; scene.fog.far = 30; }
    else if (w === 'fog') { ensureRain(0); scene.fog.near = 3; scene.fog.far = 18; }
    else { ensureRain(0); scene.fog.near = 12; scene.fog.far = 46; }
  },

  spawnZombies(list) {
    if (!ok) return;
    for (const a of actors) scene.remove(a.group);
    actors = [];
    list.forEach((z, i) => {
      const ang = -0.6 + i * 0.7;
      const px = Math.sin(ang) * (5 + i), pz = -3 - i * 1.5;
      if (loaded.zombie) {
        const m = new THREE.Group();
        const inner = loaded.zombie.outer.clone(true);
        m.add(inner);
        tintZombie(m, z.color || 0x6a8f5f);
        m.position.set(px, 0, pz);
        m.rotation.y = Math.PI;
        scene.add(m);
        const anim = makeMixerRec(m, loaded.zombie.clips);
        const rec = { group: m, phase: Math.random() * 10, dead: false, glb: true, anim, glbBase: baseClip() };
        playClip(anim, rec.glbBase);
        actors.push(rec);
        return;
      }
      const m = makeZombie(z.color || 0x6a8f5f);
      m.position.set(px, 0, pz);
      m.rotation.y = Math.PI;
      scene.add(m);
      actors.push({ group: m, armL: m.userData.armL, armR: m.userData.armR, phase: m.userData.phase, dead: false });
    });
    applyShadows();
  },

  shake(s) { shakeT = Math.min(1.2, shakeT + (s || 0.4)); },

  combatIntro() {
    if (!ok) return;
    shakeT = Math.max(shakeT, 0.25);
    actors.forEach((z, i) => {
      if (z.dead) return;
      const g = z.group;
      const home = g.position.z;
      g.position.z = home - 11; // slide in from the dark, staggered
      tweenAxis(g, 'z', home, 0.7, i * 0.15);
    });
  },

  strike(who) {
    if (!ok) return;
    if (who === 'player' && player) {
      playOnce(playerAnim, MODELS.player.clips.attack, MODELS.player.clips[mode === 'combat' ? 'walk' : 'idle']);
      tweenAxis(player, 'z', -0.5, 0.16, 0, () => tweenAxis(player, 'z', 2, 0.3));
    } else if (who === 'enemy' && actors[0] && !actors[0].dead) {
      const z = actors[0];
      playOnce(z.anim, MODELS.zombie.clips.attack, z.glbBase || MODELS.zombie.clips.walk);
      const g = z.group;
      const home = g.position.z;
      tweenAxis(g, 'z', home + 2.4, 0.16, 0, () => tweenAxis(g, 'z', home, 0.32));
    }
  },
  damageZombie(i, kill = false) {
    const z = actors[i];
    if (!z) return;
    flashGroup(z.group); // works on capsules and loaded skins alike
    z.group.position.z += 0.5; // knockback
    if (kill) {
      z.dead = true;
      if (z.anim) z.anim.dead = true;
      // skinned Die clip if the model has one, else the classic fall-over
      const played = z.anim ? playClip(z.anim, MODELS.zombie.clips.die, true) : false;
      if (!played) { z.group.rotation.x = -Math.PI / 2.2; z.group.position.y = 0.3; }
    }
  },

  spawnLoot(n) {
    if (!ok) return;
    for (const m of lootMeshes) scene.remove(m);
    lootMeshes = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshBasicMaterial({ color: 0xe8b64c }));
      noShadow(m);
      m.position.set((Math.random() - 0.5) * 8, 0.6, -2 - Math.random() * 4);
      scene.add(m); lootMeshes.push(m);
    }
  },

  addNoiseRing(level) {
    if (!ok || level < 5) return;
    const geo = new THREE.RingGeometry(0.9, 1.0, 40);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    noShadow(m);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(player.position); m.position.y = 0.1;
    scene.add(m);
    const s = 1 + level / 12;
    let k = 0;
    const iv = setInterval(() => {
      k += 0.1; m.scale.setScalar(1 + k * s); m.material.opacity = 0.6 - k * 0.12;
      if (k > 5) { scene.remove(m); clearInterval(iv); }
    }, 40);
  },

  // Fire-and-forget: boots procedural, hot-swaps each GLB the moment it loads.
  // Safe to call when WebGL failed (no-ops) and when files are missing (fallback).
  async loadModels() {
    if (!ok) return;
    const [p, z] = await Promise.all([loadOne('player'), loadOne('zombie')]);
    if (p) { loaded.player = p; swapPlayer(p); }
    if (z) { loaded.zombie = z; } // existing actors swap on next spawnZombies
  },
  // test/conformance hooks (never game logic)
  modelsLoaded() { return { player: !!loaded.player, zombie: !!loaded.zombie }; },
  modelClips(key) {
    const m = loaded[key];
    if (!m) return null;
    return [...m.clips.keys()];
  },
};

window.ZScene = ZScene;
