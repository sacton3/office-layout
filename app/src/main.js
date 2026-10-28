import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as TX from './textures.js';
import { buildFurniture } from './furniture.js';
import { World } from './world.js';

/* ------------------------------------------------------------------ renderer */
const canvasEl = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // static scene -> bake shadows, refresh on demand
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
TX.setAniso(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b212b);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);

/* ------------------------------------------------------------------ world */
const world = new World(scene);
const fx = buildFurniture(world);
world.finalize();
renderer.shadowMap.needsUpdate = true;

/* ------------------------------------------------------------------ post */
let composer = null, aoPass = null, bloomPass = null;
let quality = true;
function buildComposer() {
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    aoPass = new GTAOPass(scene, camera, innerWidth, innerHeight);
    aoPass.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(aoPass);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.7, 0.92);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  } catch (e) { console.warn('post-processing unavailable', e); composer = null; quality = false; }
}
buildComposer();

/* ------------------------------------------------------------------ player */
const controls = new PointerLockControls(camera, canvasEl);
const EYE = 5.6, RADIUS = 0.8;
const player = { x: -5.2, z: 24.4, y: EYE };
camera.position.set(player.x, player.y, player.z);
camera.rotation.set(-0.02, -Math.PI / 2, 0); // face +x, into the lab
const keys = {};
const vel = new THREE.Vector3();
let mode = 'walk';   // 'walk' | 'fly' | 'tour'
let showCeiling = true;
let showMap = true;
let showLabels = true; // room labels appear in the overview view
let tourT = 0;

const ui = {
  overlay: document.getElementById('overlay'),
  hud: document.getElementById('hud'),
  room: document.getElementById('room'),
  mode: document.getElementById('modeTag'),
  map: document.getElementById('map'),
  hint: document.getElementById('hint'),
};

const labelEls = world.labelData.map((l) => {
  const e = document.createElement('div'); e.className = 'rlabel'; e.innerHTML = `<b>${l.txt}</b><span>${l.sub}</span>`;
  ui.hud.appendChild(e); return e;
});
let labelsOn = false;
const _lp = new THREE.Vector3();
function updateLabels() {
  world.labelData.forEach((l, i) => {
    const e = labelEls[i];
    if (!labelsOn) { e.style.display = 'none'; return; }
    _lp.copy(l.pos).project(camera);
    if (_lp.z > 1 || _lp.z < -1) { e.style.display = 'none'; return; }
    e.style.display = 'block';
    e.style.transform = `translate(-50%,-50%) translate(${((_lp.x + 1) / 2) * innerWidth}px,${((1 - _lp.y) / 2) * innerHeight}px)`;
  });
}
function applyVisibility() {
  const ceilOn = showCeiling && mode !== 'fly';
  world.setCeilings(ceilOn);
  world.setRoof(mode !== 'fly');
  labelsOn = showLabels && mode === 'fly'; 
  ui.mode.textContent = mode === 'fly' ? 'Overview / free-fly' : mode === 'tour' ? 'Guided tour' : 'Walk';
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    const k = b.dataset.toggle;
    const on = { ceiling: showCeiling, labels: showLabels, map: showMap, quality }[k];
    b.classList.toggle('on', !!on);
  });
  document.querySelectorAll('[data-shelf]').forEach((b) => b.classList.toggle('on', b.dataset.shelf === fx.state.shelf));
  ui.map.style.display = showMap ? 'block' : 'none';
}

const VIEWS = {
  lab: { p: [-5.2, EYE, 24.4], yaw: -Math.PI / 2 },
  lab2: { p: [20.5, EYE, 26.3], yaw: 1.1 },
  officeA: { p: [2.3, EYE, 19.4], yaw: -0.3 },
  officeB: { p: [20.2, EYE, 19.4], yaw: 0.3 },
  standup: { p: [2.5, EYE, 4.0], yaw: -Math.PI / 2 + 0.2 },
};
function goView(name) {
  if (name === 'overview') {
    mode = 'fly';
    camera.position.set(11.25, 42, 33);
    camera.rotation.set(-1.0, 0, 0);
    camera.rotation.y = 0;
  } else {
    const v = VIEWS[name];
    mode = 'walk';
    player.x = v.p[0]; player.z = v.p[2]; player.y = EYE;
    camera.position.set(...v.p);
    camera.rotation.set(-0.03, v.yaw, 0);
  }
  vel.set(0, 0, 0);
  applyVisibility();
}

/* ------------------------------------------------------------------ guided tour */
const TOUR = [
  [[-5.5, 5.8, 24.4], [10, 5, 24.2]],
  [[2.5, 5.7, 24.4], [11.25, 5, 21.0]],
  [[7.5, 5.6, 24.4], [11.25, 5.6, 21.0]],
  [[12.5, 5.4, 24.4], [10, 4.6, 21.2]],
  [[15.5, 5.6, 24.4], [17.2, 3.4, 27.6]],
  [[19.8, 5.6, 24.2], [20.2, 5.2, 19.0]],
  [[20.2, 5.6, 18.4], [16.5, 4.2, 10.0]],
  [[19.0, 5.6, 14.8], [16.9, 3.8, 9.5]],
  [[16.5, 5.6, 16.0], [14.0, 4.0, 9.5]],
  [[20.0, 5.6, 18.6], [20.2, 5.0, 24.0]],
  [[17.0, 5.6, 24.4], [4.0, 5.0, 24.4]],
  [[6.0, 5.6, 24.4], [2.3, 5.0, 20.0]],
  [[2.3, 5.6, 18.2], [6.0, 4.2, 10.0]],
  [[5.5, 5.6, 14.2], [6.0, 3.8, 9.5]],
  [[9.5, 5.6, 15.5], [3.5, 3.8, 10.5]],
  [[2.3, 5.6, 18.8], [2.3, 5.0, 25.0]],
  [[1.5, 5.6, 24.4], [-4.0, 5.2, 24.4]],
  [[-4.6, 5.8, 20.0], [-4.6, 5.0, 8.0]],
  [[-4.6, 5.8, 8.0], [-4.0, 5.0, 4.0]],
  [[-1.0, 5.6, 4.0], [8.0, 5.0, 4.0]],
  [[6.0, 5.6, 4.0], [16.0, 4.5, 4.0]],
  [[12.0, 5.6, 4.2], [19.0, 4.8, 1.0]],
  [[3.0, 5.6, 4.0], [-5.0, 5.0, 4.0]],
  [[-4.6, 5.8, 8.0], [-4.6, 5.0, 20.0]],
  [[-4.6, 5.8, 20.0], [-4.0, 5.2, 24.4]],
];
const tourPos = new THREE.CatmullRomCurve3(TOUR.map((t) => new THREE.Vector3(...t[0])), true, 'centripetal');
const tourLook = new THREE.CatmullRomCurve3(TOUR.map((t) => new THREE.Vector3(...t[1])), true, 'centripetal');
const TOUR_SECONDS = 150;
const _tp = new THREE.Vector3(), _tl = new THREE.Vector3();

function startTour() {
  mode = 'tour'; tourT = 0;
  hideOverlay(); applyVisibility();
}
function stopTour() {
  if (mode !== 'tour') return;
  mode = 'walk'; player.x = camera.position.x; player.z = camera.position.z; player.y = EYE;
  applyVisibility();
}

/* ------------------------------------------------------------------ input */
function hideOverlay() { ui.overlay.classList.add('hidden'); ui.hud.classList.remove('hidden'); }
function showOverlay() { ui.overlay.classList.remove('hidden'); ui.hud.classList.add('hidden'); }

document.getElementById('start').addEventListener('click', () => { hideOverlay(); controls.lock(); });
controls.addEventListener('lock', hideOverlay);
controls.addEventListener('unlock', () => { if (mode !== 'tour') showOverlay(); });
canvasEl.addEventListener('click', () => { if (!controls.isLocked && ui.overlay.classList.contains('hidden')) controls.lock(); });

function act(a) {
  switch (a) {
    case 'standup': case 'lab': case 'lab2': case 'officeA': case 'officeB': case 'overview': goView(a); break;
    case 'tour': startTour(); break;
    case 'ceiling': showCeiling = !showCeiling; applyVisibility(); break;
    case 'labels': showLabels = !showLabels; applyVisibility(); break;
    case 'map': showMap = !showMap; applyVisibility(); break;
    case 'quality': quality = !quality; if (quality && !composer) buildComposer(); applyVisibility(); break;
    case 'fly': mode = mode === 'fly' ? 'walk' : 'fly'; if (mode === 'walk') { player.x = camera.position.x; player.z = camera.position.z; } applyVisibility(); break;
    case 'shelfNext': { const o = ['overhead', 'rack', 'both', 'none']; fx.setShelf(o[(o.indexOf(fx.state.shelf) + 1) % 4]); renderer.shadowMap.needsUpdate = true; applyVisibility(); break; }
  }
}
document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); act(b.dataset.act); }));
document.querySelectorAll('[data-shelf]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fx.setShelf(b.dataset.shelf); renderer.shadowMap.needsUpdate = true; applyVisibility(); }));
document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); act(b.dataset.toggle); }));

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.code;
  keys[k] = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) stopTour();
  const map = { Digit1: 'lab', Digit2: 'officeA', Digit3: 'officeB', Digit4: 'overview', Digit5: 'lab2', Digit6: 'standup', KeyT: 'tour', KeyC: null, KeyG: 'shelfNext', KeyO: 'labels', KeyM: 'map', KeyP: 'quality', KeyF: 'fly', KeyB: 'ceiling' };
  if (map[k]) { if (k === 'KeyT' && mode === 'tour') stopTour(); else act(map[k]); }
  if (k === 'KeyH') ui.hint.classList.toggle('hidden');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer && composer.setSize(innerWidth, innerHeight);
});

/* ------------------------------------------------------------------ minimap */
const mapC = ui.map, mctx = mapC.getContext('2d');
const MAP_S = 6.2; // px per foot
mapC.width = Math.round((22.9 + 0.4 + 18) * MAP_S); mapC.height = Math.round((28.3 + 0.4 + 2) * MAP_S);
const mx = (x) => (x + 9.2) * MAP_S, mz = (z) => (z + 1.2) * MAP_S;
function drawMap() {
  mctx.clearRect(0, 0, mapC.width, mapC.height);
  mctx.fillStyle = 'rgba(8,12,18,0.72)'; mctx.fillRect(0, 0, mapC.width, mapC.height);
  const rooms = [
    ['DEV', 0, 8.5, 12, 20.5, '#2c3d52'], ['R&D', 12.4, 8.5, 22.5, 20.5, '#4a4233'],
    ['STANDUP', 0, 0, 22.5, 8.1, '#33383d'], ['LAB', 0, 20.9, 22.5, 27.9, '#2d3b3a'],
  ];
  rooms.forEach(([n, x0, z0, x1, z1, c]) => {
    mctx.fillStyle = c; mctx.fillRect(mx(x0), mz(z0), (x1 - x0) * MAP_S, (z1 - z0) * MAP_S);
  });
  mctx.fillStyle = 'rgba(255,255,255,0.35)';
  world.plan.forEach((r) => mctx.fillRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * MAP_S, (r.z1 - r.z0) * MAP_S));
  mctx.fillStyle = '#e9edf2';
  world.walls.forEach((r) => mctx.fillRect(mx(r.x0), mz(r.z0), Math.max(1.2, (r.x1 - r.x0) * MAP_S), Math.max(1.2, (r.z1 - r.z0) * MAP_S)));
  mctx.fillStyle = 'rgba(255,255,255,0.8)'; mctx.font = '600 9px Inter,Segoe UI,Arial'; mctx.textAlign = 'center';
  mctx.fillText('DEVELOPMENT', mx(6), mz(10)); mctx.fillText('R&D', mx(17.4), mz(10)); mctx.fillText('STANDUP AREA', mx(11.25), mz(2.2)); mctx.fillText('RMA / TEST LAB', mx(11.25), mz(27.5));
  const px = mx(camera.position.x), pz = mz(camera.position.z);
  const d = new THREE.Vector3(); camera.getWorldDirection(d); const a = Math.atan2(d.z, d.x);
  mctx.fillStyle = 'rgba(80,200,255,0.28)'; mctx.beginPath(); mctx.moveTo(px, pz); mctx.arc(px, pz, 34, a - 0.6, a + 0.6); mctx.fill();
  mctx.fillStyle = '#4cc2ff'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5;
  mctx.beginPath(); mctx.arc(px, pz, 4, 0, 7); mctx.fill(); mctx.stroke();
}

function roomName(x, z) {
  if (x > 0 && x < 22.5 && z > 20.9 && z < 27.9) return 'RMA / Test Lab · 7′ × 22.5′';
  if (z > 8.5 && z < 20.5 && x > 0 && x < 12) return 'Development Office · 12′ × 12′';
  if (z > 8.5 && z < 20.5 && x > 12.4 && x < 22.5) return 'R&D Office · 10′ × 12′';
  if (z > 0 && z < 8.1 && x > 0 && x < 22.5) return 'Standup Meeting Area';
  return 'Mezzanine landing';
}

/* ------------------------------------------------------------------ movement */
function collide(px, pz) {
  for (let pass = 0; pass < 3; pass++) {
    for (const c of world.colliders) {
      if (c.active === false) continue;
      const cx = Math.max(c.x0, Math.min(px, c.x1)), cz = Math.max(c.z0, Math.min(pz, c.z1));
      let dx = px - cx, dz = pz - cz; const d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (RADIUS - d) / d; px += dx * k; pz += dz * k; }
        else { // centre inside box: push out on the shortest axis
          const l = px - c.x0, r = c.x1 - px, t = pz - c.z0, b = c.z1 - pz, m = Math.min(l, r, t, b);
          if (m === l) px = c.x0 - RADIUS; else if (m === r) px = c.x1 + RADIUS; else if (m === t) pz = c.z0 - RADIUS; else pz = c.z1 + RADIUS;
        }
      }
    }
  }
  return [px, pz];
}

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
function move(dt) {
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const run = keys.ShiftLeft || keys.ShiftRight;
  const speed = (mode === 'fly' ? (run ? 40 : 16) : run ? 9 : 4.6);
  camera.getWorldDirection(fwd);
  if (mode === 'walk') { fwd.y = 0; fwd.normalize(); }
  right.crossVectors(fwd, camera.up).normalize();
  wish.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
  if (mode === 'fly') wish.y += (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
  vel.lerp(wish, 1 - Math.exp(-dt * 9));
  if (mode === 'walk') {
    let nx = player.x + vel.x * dt, nz = player.z + vel.z * dt;
    [nx, nz] = collide(nx, nz);
    player.x = nx; player.z = nz;
    camera.position.set(player.x, EYE, player.z);
  } else {
    camera.position.addScaledVector(vel, dt);
    camera.position.y = Math.max(1, Math.min(120, camera.position.y));
  }
}

/* ------------------------------------------------------------------ adaptive quality */
let renderScale = 1, perfAcc = 0, perfN = 0, perfLow = 0, perfHigh = 0;
const BASE_DPR = Math.min(window.devicePixelRatio || 1, 1.5);
function setScale(s) {
  renderScale = s;
  const r = BASE_DPR * s; renderer.setPixelRatio(r); composer && composer.setPixelRatio(r);
  renderer.setSize(innerWidth, innerHeight); composer && composer.setSize(innerWidth, innerHeight);
}
function perf(dt) {
  if (dt > 0.25) return; perfAcc += dt; perfN++;
  if (perfAcc < 1.5) return;
  const fps = perfN / perfAcc; perfAcc = 0; perfN = 0;
  if (fps < 26) { perfHigh = 0; if (++perfLow >= 1) { perfLow = 0; if (quality && renderScale <= 0.75) { quality = false; applyVisibility(); } else if (renderScale > 0.5) setScale(Math.max(0.5, renderScale - 0.15)); } }
  else if (fps > 58) { perfLow = 0; if (++perfHigh >= 3 && renderScale < 1) { perfHigh = 0; setScale(Math.min(1, renderScale + 0.1)); } }
  else { perfLow = 0; perfHigh = 0; }
}

/* ------------------------------------------------------------------ loop */
const clock = new THREE.Clock();
let mapTick = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'tour') {
    tourT = (tourT + dt / TOUR_SECONDS) % 1;
    tourPos.getPointAt(tourT, _tp); tourLook.getPointAt(tourT, _tl);
    camera.position.lerp(_tp, 1 - Math.exp(-dt * 6));
    const q0 = camera.quaternion.clone();
    const m = new THREE.Matrix4().lookAt(camera.position, _tl, camera.up); // eye, target, up
    const q1 = new THREE.Quaternion().setFromRotationMatrix(m);
    camera.quaternion.copy(q0.slerp(q1, 1 - Math.exp(-dt * 4)));
  } else if (controls.isLocked) move(dt);
  perf(dt);
  updateLabels();
  world.updateDoors(dt, camera.position);
  fx.update(dt, clock.elapsedTime);
  mapTick += dt;
  if (mapTick > 0.05) { mapTick = 0; ui.room.textContent = roomName(camera.position.x, camera.position.z); if (showMap) drawMap(); }
  if (quality && composer) composer.render(dt); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
applyVisibility();
// show first frame behind the start screen
requestAnimationFrame(frame);
window.__app = { tourPos, keys, vel, controls, camera, player, act, goView, world, renderer, scene, fx, get mode() { return mode; } };
