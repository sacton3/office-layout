import * as THREE from 'three';

// Procedural canvas textures. Every texture is authored so that 1 repeat = `size` feet.
let seed = 1337;
export const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const R = (a, b) => a + rnd() * (b - a);

const canvas = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

let aniso = 8;
export const setAniso = (n) => { aniso = n; };

export function tex(c, size = 4, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size, 1 / size);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(ctx, w, h, n, lo, hi, a = 0.25, sz = 1.5) {
  for (let i = 0; i < n; i++) {
    const v = R(lo, hi) | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${R(a * 0.3, a)})`;
    const s = R(0.6, sz);
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

function blobs(ctx, w, h, n, rMin, rMax, light, dark, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = R(rMin, rMax);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() > 0.5 ? light : dark;
    g.addColorStop(0, `rgba(${c},${R(a * 0.3, a)})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// Sealed / polished concrete with saw-cut control joints every 8 ft
export function concrete() {
  const w = 1024, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#8d8e8b'; x.fillRect(0, 0, w, w);
  blobs(x, w, w, 160, 60, 220, '170,170,166', '90,90,88', 0.22);
  blobs(x, w, w, 40, 8, 40, '60,60,58', '60,60,58', 0.16);
  speckle(x, w, w, 14000, 70, 200, 0.35, 2);
  x.strokeStyle = 'rgba(40,40,40,0.55)'; x.lineWidth = 2;
  x.strokeRect(1, 1, w - 2, w - 2);
  // a faint hairline crack
  x.strokeStyle = 'rgba(50,50,50,0.25)'; x.lineWidth = 1; x.beginPath();
  let px = 120, py = 200; x.moveTo(px, py);
  for (let i = 0; i < 30; i++) { px += R(8, 22); py += R(-14, 18); x.lineTo(px, py); }
  x.stroke();
  return c;
}

export function carpetTile() {
  const w = 1024, c = canvas(w), x = c.getContext('2d');
  const tones = [['#56616d', '#5d6975'], ['#5a6571', '#525d68']];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    x.fillStyle = tones[i][j]; x.fillRect(i * 512, j * 512, 512, 512);
  }
  speckle(x, w, w, 90000, 30, 190, 0.5, 2.2);
  for (let i = 0; i < 2600; i++) { // fibre streaks
    x.strokeStyle = `rgba(${rnd() > 0.5 ? 200 : 30},${rnd() > 0.5 ? 200 : 30},${rnd() > 0.5 ? 210 : 40},0.08)`;
    x.lineWidth = 1; x.beginPath(); const a = rnd() * w, b = rnd() * w;
    x.moveTo(a, b); x.lineTo(a + R(-4, 4), b + R(4, 10)); x.stroke();
  }
  x.strokeStyle = 'rgba(20,24,28,0.55)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(512, 0); x.lineTo(512, w); x.moveTo(0, 512); x.lineTo(w, 512); x.stroke();
  x.strokeRect(0, 0, w, w);
  return c;
}

export function ceilingTile() {
  const w = 512, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#f0f0ec'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 5000, 120, 200, 0.5, 2);
  speckle(x, w, w, 1400, 20, 90, 0.5, 2.6);
  for (let i = 0; i < 40; i++) { // fissures
    x.strokeStyle = 'rgba(120,120,115,0.25)'; x.lineWidth = 1; x.beginPath();
    const a = rnd() * w, b = rnd() * w; x.moveTo(a, b); x.lineTo(a + R(-18, 18), b + R(-6, 6)); x.stroke();
  }
  x.strokeStyle = '#cfcfcb'; x.lineWidth = 14; x.strokeRect(0, 0, w, w);
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.strokeRect(7, 7, w - 14, w - 14);
  return c;
}

export function paintTex() {
  const w = 512, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 38000, 190, 255, 0.5, 1.8);
  speckle(x, w, w, 18000, 150, 200, 0.3, 1.8);
  blobs(x, w, w, 40, 40, 160, '255,255,255', '200,200,200', 0.1);
  return c;
}

export function woodTex(base = '#a6794a') {
  const w = 1024, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 520; i++) {
    const y = rnd() * w, a = R(0.04, 0.16), dark = rnd() > 0.4;
    x.strokeStyle = dark ? `rgba(60,34,14,${a})` : `rgba(255,220,170,${a * 0.7})`;
    x.lineWidth = R(0.6, 3); x.beginPath(); x.moveTo(0, y);
    for (let k = 1; k <= 8; k++) x.lineTo((k * w) / 8, y + Math.sin(k * 0.9 + i) * R(0.5, 4));
    x.stroke();
  }
  for (let i = 0; i < 5; i++) { // knots
    const kx = rnd() * w, ky = rnd() * w;
    for (let r = 4; r < 22; r += 3) {
      x.strokeStyle = `rgba(55,30,12,${0.28 - r * 0.009})`; x.lineWidth = 1.5;
      x.beginPath(); x.ellipse(kx, ky, r * 2.4, r * 0.7, 0, 0, 7); x.stroke();
    }
  }
  return c;
}

export function osbTex() {
  const w = 1024, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#c7a469'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 2600; i++) {
    const l = R(30, 110), th = R(5, 14), a = R(0.1, 0.32);
    const v = R(-26, 26);
    x.fillStyle = `rgba(${150 + v},${108 + v},${52 + v},${a})`;
    x.save(); x.translate(rnd() * w, rnd() * w); x.rotate(R(-0.3, 0.3) + (rnd() > 0.5 ? 0 : Math.PI / 2));
    x.fillRect(0, 0, l, th); x.restore();
  }
  x.fillStyle = 'rgba(45,45,45,0.22)'; x.font = 'bold 56px sans-serif'; x.save();
  x.translate(180, 520); x.rotate(-0.04); x.fillText('AdvanTech', 0, 0); x.restore();
  x.strokeStyle = 'rgba(60,50,30,0.5)'; x.lineWidth = 2; x.strokeRect(0, 0, w, w);
  return c;
}

export function corrugated() {
  const w = 256, c = canvas(w), x = c.getContext('2d');
  for (let i = 0; i < w; i++) {
    const s = Math.sin((i / w) * Math.PI * 2 * 4);
    const v = 190 + s * 38;
    x.fillStyle = `rgb(${v | 0},${(v * 0.96) | 0},${(v * 0.8) | 0})`;
    x.fillRect(i, 0, 1, w);
  }
  for (let i = 0; i < 40; i++) { // vertical grime streaks
    x.fillStyle = `rgba(90,70,40,${R(0.02, 0.08)})`;
    x.fillRect(rnd() * w, 0, R(1, 6), w);
  }
  return c;
}

export function corrugatedBump() {
  const w = 256, c = canvas(w), x = c.getContext('2d');
  for (let i = 0; i < w; i++) {
    const v = 128 + Math.sin((i / w) * Math.PI * 2 * 4) * 127;
    x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; x.fillRect(i, 0, 1, w);
  }
  return c;
}

export function ledModule() {
  const w = 256, h = 128, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#16171a'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < 32; j++) for (let i = 0; i < 64; i++) {
    x.fillStyle = '#26282d'; x.beginPath(); x.arc(i * 4 + 2, j * 4 + 2, 1.35, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(i * 4, j * 4, 4, 0.8);
  }
  x.strokeStyle = '#000'; x.lineWidth = 2; x.strokeRect(0, 0, w, h);
  return c;
}

// Emissive content shown when the LED panels are "powered on" — wide colour bars + grid
export function ledOn() {
  const w = 1024, h = 256, c = canvas(w, h), x = c.getContext('2d');
  const bars = ['#ffffff', '#ffe600', '#00e5ff', '#00d13f', '#ff00d4', '#ff1c1c', '#1f3cff', '#101010'];
  bars.forEach((b, i) => { x.fillStyle = b; x.fillRect((i * w) / 8, 0, w / 8 + 1, h * 0.7); });
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
  x.fillStyle = g; x.fillRect(0, h * 0.7, w, h * 0.3);
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1;
  for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  for (let j = 0; j <= h; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
  return c;
}

export function esdMat() {
  const w = 512, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#0f7a5c'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 22000, 40, 160, 0.3, 2);
  blobs(x, w, w, 30, 30, 120, '60,190,150', '0,60,40', 0.12);
  return c;
}

export function rubberMat() {
  const w = 256, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#1d1d1f'; x.fillRect(0, 0, w, w);
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    x.fillStyle = 'rgba(70,70,74,0.55)'; x.beginPath(); x.arc(i * 16 + 8, j * 16 + 8, 4.5, 0, 7); x.fill();
  }
  return c;
}

export function screenTex(kind = 0) {
  const w = 512, h = 288, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, kind ? '#0b3d91' : '#12295a'); g.addColorStop(1, kind ? '#3aa0e8' : '#1d6fb8');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(60, 40, 260, 170);
  x.fillStyle = '#e6eef7'; x.fillRect(60, 40, 260, 18);
  x.fillStyle = '#3b7dd8'; for (let i = 0; i < 7; i++) x.fillRect(75, 74 + i * 18, R(80, 220), 7);
  x.fillStyle = 'rgba(15,15,20,0.9)'; x.fillRect(0, h - 22, w, 22);
  x.fillStyle = '#6fb1ff'; for (let i = 0; i < 6; i++) x.fillRect(10 + i * 26, h - 17, 16, 12);
  return c;
}

export function whiteboardTex() {
  const w = 512, h = 256, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#f6f8f8'; x.fillRect(0, 0, w, h);
  blobs(x, w, h, 20, 20, 80, '255,255,255', '220,225,225', 0.2);
  const cols = ['#1b4fd6', '#d62a2a', '#1a9a4a', '#222'];
  for (let k = 0; k < 6; k++) {
    x.strokeStyle = cols[k % 4]; x.lineWidth = 3; x.beginPath();
    let px = 30 + rnd() * 60, py = 36 + k * 36; x.moveTo(px, py);
    for (let i = 0; i < 12; i++) { px += R(10, 30); py += R(-6, 6); x.lineTo(px, py); }
    x.stroke();
  }
  x.strokeStyle = '#d62a2a'; x.lineWidth = 3; x.strokeRect(320, 50, 150, 100);
  return c;
}

export function artTex(h1 = 200, h2 = 30) {
  const w = 256, c = canvas(w, w * 0.75), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, w);
  g.addColorStop(0, `hsl(${h1},45%,28%)`); g.addColorStop(1, `hsl(${h2},60%,55%)`);
  x.fillStyle = g; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `hsla(${R(0, 360)},50%,${R(40, 85)}%,0.55)`;
    x.beginPath(); x.arc(rnd() * w, rnd() * 190, R(14, 60), 0, 7); x.fill();
  }
  return c;
}

export function cardboard() {
  const w = 256, c = canvas(w), x = c.getContext('2d');
  x.fillStyle = '#b48b58'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(90,60,30,${R(0.05, 0.16)})`; x.beginPath();
    const y = rnd() * w; x.moveTo(0, y); x.lineTo(w, y + R(-3, 3)); x.stroke();
  }
  speckle(x, w, w, 3500, 60, 150, 0.35, 2);
  x.fillStyle = 'rgba(210,190,150,0.8)'; x.fillRect(0, w / 2 - 6, w, 12); // tape
  return c;
}

export function labelTex(text, sub, { bg = '#14233a', fg = '#ffffff', accent = '#4cc2ff' } = {}) {
  const c = canvas(512, 160), x = c.getContext('2d');
  const r = 26;
  x.fillStyle = bg; x.beginPath();
  x.moveTo(r, 0); x.arcTo(512, 0, 512, 160, r); x.arcTo(512, 160, 0, 160, r);
  x.arcTo(0, 160, 0, 0, r); x.arcTo(0, 0, 512, 0, r); x.fill();
  x.fillStyle = accent; x.fillRect(0, 0, 14, 160);
  x.fillStyle = fg; x.font = '600 54px Inter, Segoe UI, Arial, sans-serif'; x.textBaseline = 'middle';
  x.fillText(text, 40, sub ? 62 : 80);
  if (sub) { x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = '400 34px Inter, Segoe UI, Arial, sans-serif'; x.fillText(sub, 40, 116); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function extinguisherSign() {
  const c = canvas(128, 256), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 256);
  x.fillStyle = '#d7261e'; x.fillRect(6, 6, 116, 244);
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(64, 236); x.lineTo(20, 150); x.lineTo(50, 150);
  x.lineTo(50, 24); x.lineTo(78, 24); x.lineTo(78, 150); x.lineTo(108, 150); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Lab logo (white-on-transparent PNG) on a rounded black panel; the logo is drawn once the image has loaded.
export function logoPanel(url, w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const r = 90;
  x.fillStyle = '#000'; x.beginPath();
  x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r); x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    const pad = (w - img.width) / 2;
    x.drawImage(img, pad, (h - img.height) / 2); t.needsUpdate = true;
  };
  img.src = url;
  return t;
}
