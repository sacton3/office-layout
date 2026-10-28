import * as THREE from 'three';
import * as TX from './textures.js';
import { rnd } from './textures.js';
import logoUrl from './assets/lab-logo.png';

const R = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[(rnd() * arr.length) | 0];

export function buildFurniture(W) {
  const m = W.m;
  const root = W.root;
  const state = { shelf: 'overhead' };

  /* ------------------------------------------------------------ utilities */
  const group = (x, z, ry = 0, y = 0, parent = root) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
  };
  const b = (g, w, h, d, mat, x, y, z, o) => W.B(w, h, d, mat, x, y, z, g, o); // centre-based box in group
  const cyl = (g, r, h, mat, x, y, z, seg = 16, r2 = r) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat);
    c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = true; g.add(c); return c;
  };
  const sph = (g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; g.add(s); return s;
  };
  const plan = (g, tag, shrink = 0) => {
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    const r = { x0: bb.min.x + shrink, z0: bb.min.z + shrink, x1: bb.max.x - shrink, z1: bb.max.z - shrink };
    W.plan.push(r);
    return r;
  };
  const solid = (g, tag, shrink = 0) => {
    const r = plan(g, tag, shrink);
    return W.addCollider(r.x0, r.z0, r.x1, r.z1, tag);
  };
  const plane = (mat, w, h, x, y, z, ry = 0, parent = root) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p;
  };

  /* ------------------------------------------------------------ prefabs */
  function chair(x, z, ry = 0, mat = m.fabric) {
    const g = group(x, z, ry);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const arm = b(g, 0.12, 0.08, 1.05, m.steel, Math.sin(a) * 0.5, 0.25, Math.cos(a) * 0.5, { recv: false });
      arm.rotation.y = a;
      sph(g, 0.07, m.black, Math.sin(a) * 0.98, 0.12, Math.cos(a) * 0.98);
    }
    cyl(g, 0.07, 1.1, m.steel, 0, 0.9, 0, 10);
    b(g, 1.55, 0.26, 1.5, mat, 0, 1.6, 0);
    b(g, 1.4, 1.9, 0.22, mat, 0, 2.75, -0.7).rotation.x = -0.08;
    b(g, 0.14, 0.12, 1.0, m.black, -0.85, 2.15, 0); b(g, 0.14, 0.12, 1.0, m.black, 0.85, 2.15, 0);
    b(g, 0.1, 0.55, 0.1, m.black, -0.85, 1.9, 0); b(g, 0.1, 0.55, 0.1, m.black, 0.85, 1.9, 0);
    return g;
  }
  function stool(x, z) {
    const g = group(x, z, 0);
    cyl(g, 0.7, 0.25, m.black, 0, 2.2, 0, 20);
    cyl(g, 0.08, 1.9, m.steel, 0, 1.2, 0, 8);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 20), m.steel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.85; g.add(ring);
    cyl(g, 0.7, 0.1, m.steel, 0, 0.1, 0, 20);
    return g;
  }
  function monitor(g, x, y, z, ry = 0, w = 1.9, h = 1.1, screen = m.screen0) {
    const mg = group(x, z, ry, y, g);
    b(mg, w + 0.1, h + 0.1, 0.1, m.black, 0, h / 2 + 0.55, 0);
    plane(screen, w, h, 0, h / 2 + 0.55, 0.055, 0, mg);
    b(mg, 0.2, 0.55, 0.1, m.steel, 0, 0.3, -0.05);
    b(mg, 0.9, 0.04, 0.55, m.steel, 0, 0.03, 0.05);
    return mg;
  }
  function laptop(g, x, y, z, ry = 0, screen = m.screen1) {
    const lg = group(x, z, ry, y, g);
    b(lg, 1.1, 0.05, 0.8, m.steel, 0, 0.03, 0);
    b(lg, 1.05, 0.03, 0.55, m.black, 0, 0.065, 0.05);
    const lid = group(0, -0.38, 0, 0.05, lg); lid.rotation.x = -0.35;
    b(lid, 1.1, 0.72, 0.04, m.steel, 0, 0.36, 0);
    plane(screen, 1.0, 0.62, 0, 0.36, 0.025, 0, lid);
    return lg;
  }
  function keyboard(g, x, y, z, ry = 0) {
    const kg = group(x, z, ry, y, g); b(kg, 1.35, 0.06, 0.45, m.black, 0, 0.03, 0);
    b(kg, 1.25, 0.02, 0.36, m.steel, 0, 0.065, 0); return kg;
  }
  function mug(g, x, y, z, mat = m.white) { cyl(g, 0.16, 0.34, mat, x, y + 0.17, z, 12); }
  function lamp(g, x, y, z) {
    cyl(g, 0.3, 0.05, m.black, x, y + 0.03, z, 12); b(g, 0.05, 1.3, 0.05, m.black, x, y + 0.7, z);
    const s = b(g, 0.7, 0.14, 0.4, m.black, x + 0.25, y + 1.35, z); s.rotation.z = 0.15;
  }

  function deskUnit(x, z, ry, w, d, mat = m.wood, pedestal = 'right') {
    const g = group(x, z, ry);
    b(g, w, 0.14, d, mat, 0, 2.45, 0);
    const ps = pedestal === 'left' ? -1 : 1;   // the panel goes on the side opposite the pedestal
    b(g, 0.12, 2.38, d - 0.2, m.laminate, -ps * (w / 2 - 0.08), 1.2, 0, { recv: false });
    b(g, w - 0.2, 1.2, 0.08, m.laminate, 0, 1.75, -d / 2 + 0.2, { recv: false }); // modesty panel
    if (pedestal) {
      const sx = pedestal === 'right' ? 1 : -1, px = sx * (w / 2 - 1.15);
      b(g, 1.9, 2.38, d - 0.25, m.laminate, px, 1.2, 0);
      for (let i = 0; i < 3; i++) {
        b(g, 1.75, 0.7, 0.06, mat, px, 0.5 + i * 0.78, d / 2 - 0.1);
        b(g, 0.5, 0.05, 0.07, m.chrome, px, 0.62 + i * 0.78, d / 2 - 0.06);
      }
    } else b(g, 0.12, 2.38, d - 0.2, m.laminate, w / 2 - 0.08, 1.2, 0, { recv: false });
    return g;
  }

  function bookcase(x, z, ry, w = 3.4, h = 6.6, d = 1.1, books = true) {
    const g = group(x, z, ry);
    b(g, 0.1, h, d, m.darkWood, -w / 2 + 0.05, h / 2, 0); b(g, 0.1, h, d, m.darkWood, w / 2 - 0.05, h / 2, 0);
    b(g, w, h, 0.06, m.darkWood, 0, h / 2, -d / 2 + 0.03, { recv: false });
    const n = Math.round(h / 1.1);
    for (let i = 0; i <= n; i++) {
      const y = 0.18 + (i * (h - 0.25)) / n;
      b(g, w - 0.1, 0.1, d - 0.05, m.darkWood, 0, y, 0.0);
      if (books && i < n) {
        let bx = -w / 2 + 0.2; const bh = (h - 0.25) / n - 0.25;
        while (bx < w / 2 - 0.35) {
          const bw = R(0.08, 0.22), hh = bh * R(0.6, 1);
          b(g, bw, hh, d * 0.7, pick(m.bookColors), bx + bw / 2, y + 0.05 + hh / 2, 0.02, { recv: false });
          bx += bw + 0.01; if (rnd() < 0.07) bx += R(0.3, 1.0);
        }
      }
    }
    return g;
  }
  function filingCab(x, z, ry, drawers = 3) {
    const g = group(x, z, ry); const h = drawers * 1.15 + 0.1;
    b(g, 1.6, h, 2.0, m.beige, 0, h / 2, 0);
    for (let i = 0; i < drawers; i++) {
      b(g, 1.45, 1.0, 0.05, m.beige, 0, 0.62 + i * 1.15, 1.02);
      b(g, 0.6, 0.08, 0.08, m.chrome, 0, 0.9 + i * 1.15, 1.07);
    }
    return g;
  }
  function plant(x, z, s = 1, parent = root, y = 0) {
    const g = group(x, z, 0, y, parent);
    cyl(g, 0.5 * s, 1.2 * s, m.pot, 0, 0.6 * s, 0, 16, 0.38 * s);
    cyl(g, 0.44 * s, 0.06, new THREE.MeshStandardMaterial({ color: 0x3a2a1a }), 0, 1.18 * s, 0, 14);
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 6.28, r = R(0.1, 0.5) * s;
      sph(g, R(0.45, 0.75) * s, m.green, Math.cos(a) * r, R(1.8, 3.3) * s, Math.sin(a) * r, 1, R(0.8, 1.3), 1);
    }
    return g;
  }
  function whiteboard(x, y, z, ry, w = 5, h = 2.8) {
    const g = group(x, z, ry, y);
    b(g, w + 0.2, h + 0.2, 0.08, m.chrome, 0, 0, 0);
    plane(m.whiteboard, w, h, 0, 0, 0.045, 0, g);
    b(g, w * 0.7, 0.1, 0.18, m.chrome, 0, -h / 2 - 0.1, 0.06);
    return g;
  }
  function art(x, y, z, ry, w, h, i) {
    const g = group(x, z, ry, y);
    b(g, w + 0.14, h + 0.14, 0.1, m.black, 0, 0, 0); plane(m.art[i % 3], w, h, 0, 0, 0.055, 0, g);
  }
  function rug(x, z, w, d, ry = 0) {
    const g = group(x, z, ry); b(g, w, 0.05, d, m.rug, 0, 0.03, 0, { cast: false });
    b(g, w - 0.7, 0.055, d - 0.7, new THREE.MeshStandardMaterial({ color: 0x31455f, roughness: 1 }), 0, 0.035, 0, { cast: false });
    return g;
  }
  function tote(g, x, y, z, w, h, d, mat, clear = false) {
    b(g, w, h, d, mat, x, y + h / 2, z);
    if (clear) b(g, w * 0.96, 0.05, d * 0.96, m.clear, x, y + h + 0.02, z, { cast: false });
  }
  // random clutter of equipment boxes along a shelf
  function clutter(g, x0, x1, y, z, d, maxH = 0.9) {
    let x = x0 + 0.1;
    while (x < x1 - 0.4) {
      const w = R(0.5, 1.15), h = R(0.35, maxH), kind = rnd();
      if (kind < 0.35) tote(g, x + w / 2, y, z, w, h, d * R(0.7, 0.95), pick(m.totes), rnd() > 0.4);
      else if (kind < 0.7) { b(g, w, h, d * 0.8, m.cardboard, x + w / 2, y + h / 2, z); }
      else if (kind < 0.85) { b(g, w, h * 0.6, d * 0.7, m.black, x + w / 2, y + h * 0.3, z); b(g, 0.35, 0.04, 0.1, m.chrome, x + w / 2, y + h * 0.6, z + d * 0.36); }
      else { cyl(g, R(0.18, 0.3), h, pick([m.blue, m.red, m.white]), x + w / 2, y + h / 2, z, 12); }
      x += w + R(0.06, 0.25);
    }
  }
  function coil(g, x, y, z, color = 0x111111) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    t.rotation.x = Math.PI / 2; t.position.set(x, y + 0.07, z); t.castShadow = true; g.add(t);
    const t2 = t.clone(); t2.position.y += 0.12; t2.scale.set(0.8, 0.8, 1); g.add(t2);
  }

  /* ================================================================ OFFICES */
  const sign = (txt, x, y, z, ry, o = { bg: '#f1f1ee', fg: '#162338', accent: '#2e73c8' }) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), new THREE.MeshBasicMaterial({ map: TX.labelTex(txt, null, o) }));
    s.position.set(x, y, z); s.rotation.y = ry; root.add(s);
  };
  const plateMat = (txt, sub) => new THREE.MeshBasicMaterial({ map: TX.labelTex(txt, sub, { bg: '#1b2a3d', fg: '#ffffff', accent: '#4cc2ff' }) });
  // desk name plate facing the visitor side (+z)
  function nameplate(x, z, name, title, ry = 0) {
    const g = group(x, z, ry, 2.52);
    b(g, 1.5, 0.06, 0.5, m.chrome, 0, 0.03, 0);
    const p = plane(plateMat(name, title), 1.4, 0.44, 0, 0.3, 0.2, 0, g); p.rotation.x = -0.45;
    const back = b(g, 1.4, 0.44, 0.04, m.black, 0, 0.27, 0.12, { cast: false }); back.rotation.x = -0.45;
  }
  // a developer / researcher workstation against the north wall; user sits wall-side facing the door.
  // Two monitors flank a laptop in the centre of the desk.
  function workstation(cx, zDesk, w, name, title, pedestal, ry = Math.PI, plate = null) {
    const dg = deskUnit(cx, zDesk, ry, w, 2.7, m.wood, pedestal);
    solid(dg, 'desk', 0.1);
    monitor(dg, -1.1, 2.52, -0.1, 0.15, 1.9, 1.1, m.screen0);
    monitor(dg, 1.1, 2.52, -0.1, -0.15, 1.9, 1.1, m.screen1);
    laptop(dg, 0, 2.52, 0.8, 0, m.screen1);
    keyboard(dg, -1.45, 2.52, 0.95, 0);
    lamp(dg, -w / 2 + 0.45, 2.52, -0.5); mug(dg, w / 2 - 0.5, 2.52, 0.7);
    if (plate) nameplate(plate.x, plate.z, name, title, plate.ry);
    else nameplate(cx - Math.sin(ry) * 0.95, zDesk - Math.cos(ry) * 0.95, name, title, ry + Math.PI);
    chair(cx + Math.sin(ry) * 1.9, zDesk + Math.cos(ry) * 1.9, ry + Math.PI - 0.12, m.fabric);
    return dg;
  }
  function clock(x, y, z, ry = 0) {
    const g = group(x, z, ry, y);
    const face = cyl(g, 0.55, 0.08, m.black, 0, 0, 0.04, 28); face.rotation.x = Math.PI / 2;
    const dial = cyl(g, 0.48, 0.02, m.white, 0, 0, 0.09, 28); dial.rotation.x = Math.PI / 2;
    b(g, 0.04, 0.34, 0.02, m.black, 0, 0.14, 0.11, { cast: false });
    const hr = b(g, 0.05, 0.26, 0.02, m.black, 0.08, -0.04, 0.11, { cast: false }); hr.rotation.z = 1.1;
  }
  function coatRack(x, z) {
    const g = group(x, z, 0);
    cyl(g, 0.55, 0.1, m.black, 0, 0.05, 0, 20); cyl(g, 0.07, 5.6, m.black, 0, 2.85, 0, 8);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      const arm = b(g, 0.07, 0.07, 0.6, m.black, Math.sin(a) * 0.3, 5.4, Math.cos(a) * 0.3, { recv: false }); arm.rotation.y = a;
      sph(g, 0.07, m.black, Math.sin(a) * 0.6, 5.4, Math.cos(a) * 0.6);
    }
    // jacket and a bag
    b(g, 0.8, 1.8, 0.3, m.fabric, 0.15, 4.4, 0.55, { recv: false });
    solid(g, 'coat rack', 0.1);
  }
  function credenza(x, z, w = 4.2) {
    const g = group(x, z, 0);
    b(g, w, 2.3, 1.5, m.laminate, 0, 1.15, 0);
    b(g, w + 0.15, 0.14, 1.65, m.wood, 0, 2.37, 0);
    const n = Math.round(w / 1.4);
    for (let i = 0; i < n; i++) {
      b(g, w / n - 0.12, 2.0, 0.05, m.wood, -w / 2 + (i + 0.5) * (w / n), 1.15, 0.77);
      b(g, 0.07, 0.5, 0.07, m.chrome, -w / 2 + (i + 0.5) * (w / n) + 0.35, 1.5, 0.82);
    }
    solid(g, 'credenza', 0.05);
    return g;
  }
  function printer(g, x, y, z) {
    b(g, 1.7, 0.75, 1.2, m.white, x, y + 0.375, z); b(g, 1.4, 0.05, 0.8, m.black, x, y + 0.78, z);
    b(g, 1.2, 0.05, 0.5, m.white, x, y + 0.2, z + 0.75, { cast: false });
  }
  function bin(x, z) { const g = group(x, z, 0); cyl(g, 0.42, 1.2, m.black, 0, 0.6, 0, 16, 0.34); }
  const OZ = 8.5;

  // ---- Development office (x 0 -> 12, z 8.5 -> 20.5): Jake Knight + Noah Mann, two desks at right angles
  rug(6.5, 13.5, 10.5, 7);
  workstation(3.4, OZ + 3.35, 5.2, 'Jake Knight', 'Senior Developer', 'right');                        // north wall, facing the door
  workstation(10.65, 15.0, 5.2, 'Noah Mann', 'Junior Developer', 'left', -Math.PI / 2, { x: 10.65, z: 17.0, ry: 0 });   // east wall; name plate on the door end, perpendicular to Jake
  {
    whiteboard(11.95, 4.5, 10.3, -Math.PI / 2, 3.0, 2.8);
    // wall decor
    art(3.4, 6.4, 8.58, 0, 2.8, 1.6, 0); art(8.9, 6.4, 8.58, 0, 2.8, 1.6, 2); clock(6.15, 6.6, 8.58);
    art(0.08, 5.3, 15.0, Math.PI / 2, 2.6, 1.9, 1);
    plant(11.0, 19.4, 1.1); plant(0.9, 9.4, 1.0);
  }

  // ---- R&D office (x 12.4 -> 22.5, z 8.5 -> 20.5): Sam Acton
  rug(17.45, 12.6, 7.4, 4.8);
  {
    // main desk faces the doorway (south wall); two monitors with the laptop in the centre
    workstation(17.45, OZ + 3.35, 6.4, 'Sam Acton', 'Research and Development', 'right');
    // small side desk on the east wall with its own chair
    const sd = deskUnit(21.4, 16.1, -Math.PI / 2, 3.4, 2.0, m.wood, null); solid(sd, 'desk', 0.1);
    b(sd, 1.4, 0.4, 1.0, m.black, 0.2, 2.72, -0.3);                       // test unit
    lamp(sd, -1.35, 2.52, -0.6); mug(sd, 1.2, 2.52, 0.4);
    b(sd, 0.9, 0.04, 1.2, m.white, 0.0, 2.54, 0.35, { cast: false });    // note pad
    chair(19.1, 16.1, Math.PI / 2, m.fabric2);
    const bc = bookcase(21.85, 10.9, -Math.PI / 2, 3.4, 6.6, 1.1); solid(bc, 'bookcase', 0.05);
    const bench = group(14.6, 19.3, 0);
    b(bench, 2.4, 0.12, 2.0, m.laminate, 0, 2.5, 0); b(bench, 0.12, 2.5, 1.8, m.steel, -1.1, 1.25, 0); b(bench, 0.12, 2.5, 1.8, m.steel, 1.1, 1.25, 0);
    solid(bench, 'bench', 0.05);
    whiteboard(12.45, 4.5, 14.2, Math.PI / 2, 3.2, 2.8);
    // wall decor above the desk
    art(14.9, 6.4, 8.58, 0, 2.4, 1.6, 1); art(20.0, 6.4, 8.58, 0, 2.4, 1.6, 0); clock(17.45, 6.6, 8.58);
    bin(14.4, 9.6);
    plant(17.2, 19.5, 1.0);
  }

  // ---- Standup meeting area (north strip, shared with the steel company next door)
  {
    const hi = (x, z) => {
      const g = group(x, z, 0);
      cyl(g, 1.35, 0.12, m.wood, 0, 3.6, 0, 28); cyl(g, 0.14, 3.5, m.steel, 0, 1.8, 0, 12); cyl(g, 0.9, 0.12, m.steel, 0, 0.06, 0, 24);
      for (let i = 0; i < 3; i++) { const a = i * 2.1; mug(g, Math.cos(a) * 0.7, 3.66, Math.sin(a) * 0.7, i ? m.white : m.black); }
      solid(g, 'high-top table', 0);
    };
    hi(5.0, 4.4); hi(11.25, 4.4); hi(17.5, 4.4);
    // wall-mounted board + display
    whiteboard(11.25, 4.8, 0.06, 0, 8.0, 3.4);
    const tvg = group(19.5, 0.08, 0, 5.0);
    b(tvg, 5.2, 3.0, 0.14, m.black, 0, 0, 0); plane(m.screen1, 5.0, 2.8, 0, 0, 0.08, 0, tvg);
    const hz = new THREE.MeshStandardMaterial({ color: 0xe8b800, roughness: 0.6 });
    b(root, 22.0, 0.02, 0.35, hz, 11.25, 0.01, 7.2, { cast: false });         // safety line marking
    art(3.6, 5.2, 0.08, 0, 3.4, 2.4, 2);
    plant(1.2, 1.4, 1.2); plant(21.3, 1.4, 1.2);
    sign('STANDUP AREA', 11.25, 7.4, 8.06, Math.PI);
  }

  /* ================================================================ TEST LAB */
  const LZ0 = 20.9; // lab north wall (shared with offices)
  const LZ1 = 27.9; // lab south wall
  // ---- long test table -------------------------------------------------
  const TX0 = 13.3, TX1 = 19.3, TD = 2.6, TXC = (TX0 + TX1) / 2, TL = TX1 - TX0;
  const table = group(TXC, LZ1 - TD / 2, Math.PI);   // configuration desk on the south wall
  b(table, TL, 0.17, TD, m.laminate, 0, 3.0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(table, 0.22, 2.95, 0.22, m.steel, sx * (TL / 2 - 0.25), 1.47, sz * (TD / 2 - 0.2));
  b(table, TL - 0.4, 0.12, TD - 0.3, m.laminate, 0, 1.0, 0);         // lower shelf
  b(table, TL - 0.3, 0.2, 0.1, m.steel, 0, 2.8, TD / 2 - 0.14, { recv: false });
  b(table, TL - 0.3, 0.5, 0.1, m.steel, 0, 0.7, -TD / 2 + 0.14, { recv: false });
  // ESD work surface
  b(table, TL - 0.4, 0.04, TD - 0.4, m.esd, 0, 3.1, 0.05, { cast: false });
  // equipment on the bench: two PCs, soldering/rework station, parts bins, cable coils
  monitor(table, -2.0, 3.12, -0.5, 0, 1.9, 1.1, m.screen0);
  monitor(table, 0.0, 3.12, -0.5, 0.1, 1.9, 1.1, m.screen1);
  keyboard(table, -1.0, 3.12, 0.55, 0.05);
  laptop(table, 1.9, 3.12, 0.5, 0.2);
  b(table, 0.9, 0.5, 0.7, m.black, 2.3, 3.35, -0.6);               // tester chassis
  coil(table, -2.6, 3.12, 0.55, 0x112288); coil(table, 0.4, 3.12, 0.6, 0xd6a400);
  // lower shelf contents
  clutter(table, -TL / 2 + 0.3, 0, 1.06, 0, 1.6, 0.8);
  clutter(table, 0.5, TL / 2 - 0.4, 1.06, 0.1, 1.6, 0.9);
  table.userData.keep = true;
  solid(table, 'test table', 0.05);

  // ---- overhead shelving (centre of table) -----------------------------
  const shelfHigh = group(0, 0, 0); shelfHigh.userData.dynamic = true;
  shelfHigh.position.set(22.5, 0, LZ0 + LZ1); shelfHigh.rotation.y = Math.PI;   // mirrored onto the south wall, above the desk
  {
    const x0 = 9.1, x1 = 13.4, sw = x1 - x0, cx = (x0 + x1) / 2, depth = 1.15;
    for (const ux of [x0 + 0.05, cx, x1 - 0.05]) b(shelfHigh, 0.1, 3.4, 0.08, m.steel, ux, 5.95, LZ0 + 0.1);
    for (let i = 0; i < 3; i++) {
      const y = 4.4 + i * 1.15;
      b(shelfHigh, sw, 0.1, depth, m.steel, cx, y, LZ0 + depth / 2);
      b(shelfHigh, sw, 0.3, 0.05, m.steel, cx, y + 0.18, LZ0 + depth - 0.03, { cast: false });
      for (const bx of [x0 + 0.1, x1 - 0.1]) b(shelfHigh, 0.08, 0.2, depth, m.steel, bx, y - 0.14, LZ0 + depth / 2, { recv: false });
      const cg = group(0, 0, 0, 0, shelfHigh); clutter(cg, x0 + 0.05, x1 - 0.05, y + 0.05, LZ0 + depth / 2 + 0.02, 0.85, i === 2 ? 0.7 : 0.85);
    }
    const sign = W.B(1.6, 0.34, 0.03, new THREE.MeshStandardMaterial({ map: TX.labelTex('EQUIPMENT', null, { bg: '#1b2a3d' }), roughness: 0.6 }), cx, 8.2, LZ0 + 0.04, shelfHigh);
  }
  // ---- freestanding rack (alternate to the overhead shelf; south wall, centre) --------------------------
  const rackG = group(0, 0, 0); rackG.userData.dynamic = true;
  const rackSolid = (() => {
    const x0 = 9.2, x1 = 13.4, z1 = LZ1 - 0.05, depth = 1.6, z0 = z1 - depth, hh = 6.6;
    for (const px of [x0, x1]) for (const pz of [z0, z1 - 0.05]) b(rackG, 0.1, hh, 0.1, m.blue, px, hh / 2, pz);
    for (let i = 0; i < 5; i++) {
      const y = 0.3 + i * 1.5;
      b(rackG, x1 - x0, 0.1, depth, m.steel, (x0 + x1) / 2, y, (z0 + z1) / 2);
      const cg = group(0, 0, 0, 0, rackG); clutter(cg, x0 + 0.1, x1 - 0.1, y + 0.05, (z0 + z1) / 2, depth - 0.3, 1.1);
    }
    rackG.updateMatrixWorld(true);
    return W.addCollider(x0, z0, x1, z1, 'rack');
  })();

  // ---- packing station ----------------------------------------------------
  {
    const px = 6.0, pz = LZ1 - 1.35, pw = 5.6, pd = 2.6;
    const g = group(px, pz, Math.PI);   // back to the wall, work side facing the room
    b(g, pw, 0.16, pd, m.laminate, 0, 3.1, 0);
    for (const sx of [-1, 1]) { b(g, 0.12, 3.0, pd - 0.2, m.steel, sx * (pw / 2 - 0.2), 1.5, 0); }
    for (const y of [0.3, 1.2, 2.1]) b(g, pw - 0.5, 0.1, pd - 0.3, m.steel, 0, y, 0);
    for (let i = 0; i < 4; i++) b(g, 1.5, R(0.3, 0.55), 1.9, m.cardboard, -1.8 + (i % 2) * 1.8, 0.35 + (i > 1 ? 0.9 : 0), (i > 1 ? 0 : 0.1));
    b(g, 2.8, 0.35, 1.6, m.cardboard, 0.1, 2.28, 0.1); b(g, 2.2, 0.9, 1.5, m.cardboard, -0.3, 1.7, 0.05);
    b(g, 4.0, 0.03, 1.8, m.black, 0.2, 3.2, 0.1, { cast: false }).material = new THREE.MeshStandardMaterial({ color: 0x25303a, roughness: 0.9 });  // cutting mat
    // kraft paper roller + printer + label printer
    cyl(g, 0.22, 3.0, new THREE.MeshStandardMaterial({ color: 0xb48b58 }), -1.2, 3.75, -1.0, 14).rotation.z = Math.PI / 2;
    b(g, 3.2, 0.14, 0.14, m.steel, -1.2, 3.82, -1.0);
    b(g, 1.6, 0.9, 1.3, m.black, 1.9, 3.7, -0.5); b(g, 1.2, 0.04, 0.8, m.white, 1.9, 4.18, -0.5);
    b(g, 0.8, 0.35, 0.8, m.white, 0.7, 3.35, 0.7); b(g, 0.55, 0.4, 0.4, m.black, 2.5, 3.4, 0.7);
    for (let i = 0; i < 4; i++) b(g, 1.1, 0.36, 0.7, i % 2 ? m.cardboard : m.white, -2.2 + i * 0.0, 3.3 + i * 0.36, -0.9 + 0.0);
    laptop(g, -0.4, 3.18, 0.7, 0.1);
    solid(g, 'packing station', 0.05);
    const fc = filingCab(21.0, LZ1 - 1.05, Math.PI); solid(fc, 'file cabinet', 0.05);
  }

  // ---- lab logo on a rounded black panel (north wall, above the packing station)
  {
    const lw = 6.6, lh = lw * 620 / 1280, g = group(11.25, LZ0 + 0.03, 0, 6.4);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: TX.logoPanel(logoUrl, 1280, 620), transparent: true, alphaTest: 0.5 }));
    logo.position.z = 0.03; g.add(logo);
  }

  // ---- floor mat, stools, fire extinguisher, floor markings -----------
  { const g = group(11.25, 24.0, 0); b(g, 16.0, 0.07, 2.5, m.rubber, 0, 0.04, 0, { cast: false }); plan(g, 'mat'); W.plan.pop(); }
  stool(6.0, 24.3); stool(16.3, 24.3);
  {
    const g = group(21.5, 27.6, 0);
    cyl(g, 0.3, 1.4, m.red, 0, 3.2, 0, 14); sph(g, 0.3, m.red, 0, 3.95, 0);
    b(g, 0.3, 0.12, 0.12, m.black, 0, 4.18, 0);
    plane(new THREE.MeshBasicMaterial({ map: TX.extinguisherSign() }), 0.8, 1.6, 21.5, 5.6, 27.87, Math.PI);
  }
  sign('DEVELOPMENT', 2.3, 7.55, 20.93, 0); sign('R & D', 20.2, 7.55, 20.93, 0);
  const exit = { bg: '#a8201a', fg: '#ffffff', accent: '#ffffff' };
  sign('EXIT', 0.03, 7.5, 24.4, Math.PI / 2, exit); sign('EXIT', 22.47, 7.5, 24.4, -Math.PI / 2, exit);

  /* ------------------------------------------------------------ state switches */
  function setShelf(s) {
    state.shelf = s;
    const hi = s === 'overhead' || s === 'both', lo = s === 'rack' || s === 'both';
    shelfHigh.visible = hi; rackG.visible = lo; rackSolid.active = lo;
  }
  setShelf('overhead');

  return {
    state, setShelf,
    update() {},
  };
}
