import * as THREE from 'three';
import * as TX from './textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// All dimensions in feet. +z is toward the lab / front of the building, +x to the right.
export const H = 9;        // finished ceiling height
export const T = 0.4;      // wall thickness
export const DH = 6.8;     // door height

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group(); scene.add(this.root);
    this.colliders = []; this.walls = []; this.plan = [];
    this.ceilings = new THREE.Group(); this.roof = new THREE.Group(); this.labels = new THREE.Group();
    this.root.add(this.ceilings, this.roof, this.labels);
    this.doors = [];
    this.makeMaterials();
    this.buildShell();
    this.buildLighting();
    this.buildExterior();
  }

  /* ---------------------------------------------------------- helpers */
  geo(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0], uv.getY(k) * sc[f][1]);
    }
    return g;
  }
  B(w, h, d, mat, x, y, z, parent = this.root, o = {}) {
    const m = new THREE.Mesh(this.geo(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
    parent.add(m); return m;
  }
  // box from min/max corners
  R(x0, y0, z0, x1, y1, z1, mat, parent, o) {
    return this.B(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent, o);
  }
  addCollider(x0, z0, x1, z1, tag = 'wall') {
    const c = { x0, z0, x1, z1, tag, active: true }; this.colliders.push(c); return c;
  }

  /* ---------------------------------------------------------- materials */
  makeMaterials() {
    const M = (o) => new THREE.MeshStandardMaterial(o);
    const paint = TX.tex(TX.paintTex(), 8);
    const m = (this.m = {});
    const concrete = TX.tex(TX.concrete(), 8);
    m.concrete = M({ map: concrete, bumpMap: concrete, bumpScale: 0.6, roughness: 0.42, metalness: 0.02 });
    const carpet = TX.tex(TX.carpetTile(), 4);
    m.carpet = M({ map: carpet, bumpMap: carpet, bumpScale: 1.2, roughness: 0.96 });
    const ceil = TX.tex(TX.ceilingTile(), 2);
    m.ceiling = M({ map: ceil, bumpMap: ceil, bumpScale: 0.5, roughness: 0.95, side: THREE.DoubleSide });
    const mkPaint = (hex) => M({ map: paint, bumpMap: paint, bumpScale: 0.35, color: hex, roughness: 0.88 });
    m.paintLab = mkPaint(0xe9e9e5); m.paintA = mkPaint(0xc9d8e2); m.paintB = mkPaint(0xe8dcc3);
    m.paintExt = mkPaint(0xcfcfca); m.paintS = mkPaint(0xd8dccf);
    m.trim = M({ color: 0xf4f4f1, roughness: 0.4 });
    m.doorFrame = M({ color: 0x3a3d42, roughness: 0.5, metalness: 0.3 });
    const wood = TX.tex(TX.woodTex('#a77b4b'), 4);
    m.wood = M({ map: wood, bumpMap: wood, bumpScale: 0.25, roughness: 0.55 });
    const darkWood = TX.tex(TX.woodTex('#5a3a22'), 4);
    m.darkWood = M({ map: darkWood, bumpMap: darkWood, bumpScale: 0.25, roughness: 0.5 });
    m.black = M({ color: 0x1a1a1c, roughness: 0.6 });
    m.laminate = M({ color: 0x161618, roughness: 0.45, metalness: 0.05 });
    m.steel = M({ color: 0x2b2d31, roughness: 0.45, metalness: 0.7 });
    m.chrome = M({ color: 0xd2d4d8, roughness: 0.18, metalness: 1 });
    m.white = M({ color: 0xf2f2f0, roughness: 0.5 });
    m.beige = M({ color: 0xcdc5ae, roughness: 0.55, metalness: 0.2 });
    m.fabric = M({ color: 0x2d3947, roughness: 0.95 });
    m.fabric2 = M({ color: 0x8c3b2e, roughness: 0.95 });
    m.rug = M({ color: 0x24344a, roughness: 1 });
    m.glass = M({ color: 0x9fc2d6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28 });
    m.green = M({ color: 0x2f7d3d, roughness: 0.8 });
    m.pot = M({ color: 0xd9d4c8, roughness: 0.6 });
    m.red = M({ color: 0xb3261e, roughness: 0.4 });
    m.yellow = M({ color: 0xe9b800, roughness: 0.5 });
    m.blue = M({ color: 0x2564b5, roughness: 0.5 });
    m.orange = M({ color: 0xe9731a, roughness: 0.5 });
    m.clear = M({ color: 0xcfe3ee, roughness: 0.1, transparent: true, opacity: 0.35 });
    const cb = TX.tex(TX.cardboard(), 1.2);
    m.cardboard = M({ map: cb, roughness: 0.95 });
    const esd = TX.tex(TX.esdMat(), 3);
    m.esd = M({ map: esd, bumpMap: esd, bumpScale: 0.3, roughness: 0.7 });
    const rub = TX.tex(TX.rubberMat(), 1.5);
    m.rubber = M({ map: rub, bumpMap: rub, bumpScale: 1, roughness: 0.9 });
    const osb = TX.tex(TX.osbTex(), 4);
    m.osb = M({ map: osb, bumpMap: osb, bumpScale: 0.6, roughness: 0.9 });
    const cor = TX.tex(TX.corrugated(), 1);
    const corb = TX.tex(TX.corrugatedBump(), 1, false);
    m.corrugated = M({ map: cor, bumpMap: corb, bumpScale: 2.2, roughness: 0.6, metalness: 0.35 });
    m.roof = M({ color: 0xdedcd4, roughness: 0.9, side: THREE.DoubleSide });
    m.beam = M({ color: 0x4a2a22, roughness: 0.55, metalness: 0.6 });
    m.shopFloor = M({ map: concrete, color: 0xb0b0b0, roughness: 0.9 });
    m.light = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e6, emissiveIntensity: 1.6, roughness: 0.5 });
    m.screen0 = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.canvasTex(TX.screenTex(0)), emissiveIntensity: 0.9, roughness: 0.3 });
    m.screen1 = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.canvasTex(TX.screenTex(1)), emissiveIntensity: 0.9, roughness: 0.3 });
    m.whiteboard = M({ map: this.canvasTex(TX.whiteboardTex()), roughness: 0.25 });
    m.art = [M({ map: this.canvasTex(TX.artTex(200, 30)), roughness: 0.6 }), M({ map: this.canvasTex(TX.artTex(20, 190)), roughness: 0.6 }), M({ map: this.canvasTex(TX.artTex(120, 300)), roughness: 0.6 })];
    m.bookColors = [0x7b2d26, 0x2a4d69, 0x4b6c3a, 0xc9a227, 0x3b3b3b, 0x8e5b3a, 0x6b6f86, 0xb85c38, 0xe8e2d0].map((c) => M({ color: c, roughness: 0.7 }));
    m.totes = [m.yellow, m.blue, m.red, m.black, m.orange];
  }
  canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

  /* ---------------------------------------------------------- shell */
  // Wall between two x or z values; `openings` are [start,end] ranges along the run.
  // mats = {px,nx,pz,nz} paints for the faces; remaining faces use the exterior paint.
  wall(axis, a0, a1, c0, c1, openings = [], mats = {}, opts = {}) {
    const m = this.m, ext = m.paintExt;
    const piece = (s, e, y0, y1, solid) => {
      if (e - s < 0.001) return;
      const x0 = axis === 'x' ? s : c0, x1 = axis === 'x' ? e : c1;
      const z0 = axis === 'x' ? c0 : s, z1 = axis === 'x' ? c1 : e;
      const mat = [mats.px || ext, mats.nx || ext, ext, ext, mats.pz || ext, mats.nz || ext];
      const mesh = this.R(x0, y0, z0, x1, y1, z1, mat);
      if (solid) {
        this.addCollider(x0, z0, x1, z1);
        this.walls.push({ x0, z0, x1, z1 });
        // baseboard (wraps both faces)
        const bb = 0.05;
        this.R(x0 - (axis === 'z' ? bb : 0), 0, z0 - (axis === 'x' ? bb : 0), x1 + (axis === 'z' ? bb : 0), 0.42, z1 + (axis === 'x' ? bb : 0), m.trim, this.root, { cast: false });
      }
      return mesh;
    };
    let cur = a0;
    [...openings].sort((p, q) => p[0] - q[0]).forEach(([s, e]) => {
      piece(cur, s, 0, H, true);
      piece(s, e, DH, H, false);           // header above the door
      this.doorFrame(axis, s, e, c0, c1);
      cur = e;
    });
    piece(cur, a1, 0, H, true);
  }
  doorFrame(axis, s, e, c0, c1) {
    const m = this.m.doorFrame, w = 0.16, d = c1 - c0 + 0.14, mid = (c0 + c1) / 2;
    if (axis === 'x') {
      this.R(s - w, 0, mid - d / 2, s, DH + w, mid + d / 2, m, this.root, { cast: false });
      this.R(e, 0, mid - d / 2, e + w, DH + w, mid + d / 2, m, this.root, { cast: false });
      this.R(s - w, DH, mid - d / 2, e + w, DH + w, mid + d / 2, m, this.root, { cast: false });
    } else {
      this.R(mid - d / 2, 0, s - w, mid + d / 2, DH + w, s, m, this.root, { cast: false });
      this.R(mid - d / 2, 0, e, mid + d / 2, DH + w, e + w, m, this.root, { cast: false });
      this.R(mid - d / 2, DH, s - w, mid + d / 2, DH + w, e + w, m, this.root, { cast: false });
    }
  }

  // Hinged door that auto-opens when you approach.
  door({ hx, hz, dir, swing, mat, glass = false, width = 2.96, plates = [], face = 1 }) {
    const m = this.m;
    const pivot = new THREE.Group(); pivot.position.set(hx, 0, hz); pivot.rotation.y = dir; this.root.add(pivot);
    const leaf = new THREE.Group(); pivot.add(leaf);
    this.B(width, DH - 0.05, 0.16, mat, width / 2, (DH - 0.05) / 2, 0, leaf, { cast: false });
    if (glass) { // narrow vision panel
      this.B(0.55, 3.0, 0.18, m.glass, width * 0.5, 4.4, 0, leaf, { cast: false });
    }
    plates.forEach((p, i) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), new THREE.MeshBasicMaterial({ map: TX.labelTex(p.txt, p.sub, { bg: '#f1f1ee', fg: '#162338', accent: '#2e73c8' }) }));
      pl.position.set(width * 0.5, p.y, face * 0.09); if (face < 0) pl.rotation.y = Math.PI; leaf.add(pl);
    });
    // lever handle both sides
    for (const sz of [1, -1]) {
      this.B(0.1, 0.1, 0.12, m.chrome, width - 0.3, 3.1, sz * 0.14, leaf, { cast: false });
      this.B(0.5, 0.07, 0.07, m.chrome, width - 0.5, 3.1, sz * 0.2, leaf, { cast: false });
    }
    pivot.userData.dynamic = true;
    this.doors.push({ pivot, dir, swing, open: 0, target: 0, cx: hx + Math.cos(dir) * width / 2, cz: hz - Math.sin(dir) * width / 2 });
  }
  updateDoors(dt, p) {
    for (const d of this.doors) {
      const near = Math.hypot(p.x - d.cx, p.z - d.cz) < 5.2;
      d.target = near ? 1 : 0;
      d.open += (d.target - d.open) * (1 - Math.exp(-dt * 4));
      d.pivot.rotation.y = d.dir + d.swing * d.open * 1.5;
    }
  }

  buildShell() {
    const m = this.m, root = this.root, P = m;
    const FX0 = -T, FX1 = 22.5 + T, FZ0 = -T, FZ1 = 27.9 + T; // outer footprint
    const LABZ0 = 20.9, LABZ1 = 27.9;   // RMA / test hall (south side)
    const OZ0 = 8.5;                     // north wall of the offices (offices are 12' deep: z 8.5 -> 20.5)
    const PX0 = 12, PX1 = 12.4;          // partition: Development office 12' | R&D office ~10'
    this.R(FX0 - 0.1, -1.0, FZ0 - 0.1, FX1 + 0.1, -0.05, FZ1 + 0.1, m.osb, root, { recv: false });
    const slab = (x0, z0, x1, z1, mat) => this.R(x0, -0.06, z0, x1, 0, z1, mat, root, { cast: false });
    slab(0, LABZ0, 22.5, LABZ1, m.concrete); slab(0, 20.5, 22.5, LABZ0, m.concrete);
    slab(0, OZ0, PX1, 20.5, m.carpet); slab(PX1, OZ0, 22.5, 20.5, m.carpet);
    slab(0, 0, 22.5, OZ0, m.concrete);
    // walls
    this.wall('x', FX0, FX1, -T, 0, [], { pz: P.paintS });                                   // north wall (standup area)
    this.wall('x', FX0, FX1, LABZ1, FZ1, [], { nz: P.paintLab });                              // south wall (RMA)
    this.wall('z', 0, 8.1, -T, 0, [[2.5, 5.5]], { px: P.paintS });                             // west, standup (door)
    this.wall('z', 8.1, 20.5, -T, 0, [], { px: P.paintA });                                    // west, Development
    this.wall('z', 20.5, LABZ1, -T, 0, [[22.9, 25.9]], { px: P.paintLab });                    // west, RMA door
    this.wall('z', 0, 8.1, 22.5, FX1, [], { nx: P.paintS });                                   // east, standup
    this.wall('z', 8.1, 20.5, 22.5, FX1, [], { nx: P.paintB });                                // east, R&D
    this.wall('z', 20.5, LABZ1, 22.5, FX1, [[22.9, 25.9]], { nx: P.paintLab });                // east, RMA door
    this.wall('x', 0, PX0, 8.1, OZ0, [], { pz: P.paintA, nz: P.paintS });                      // offices' north wall
    this.wall('x', PX0, 22.5, 8.1, OZ0, [], { pz: P.paintB, nz: P.paintS });
    this.wall('x', 0, PX0, 20.5, LABZ0, [[0.8, 3.8]], { nz: P.paintA, pz: P.paintLab });       // RMA / Development
    this.wall('x', PX0, 22.5, 20.5, LABZ0, [[18.7, 21.7]], { nz: P.paintB, pz: P.paintLab });  // RMA / R&D
    this.wall('z', OZ0, 20.5, PX0, PX1, [], { nx: P.paintA, px: P.paintB });                   // partition
    // doors
    const oak = m.wood, steelDoor = m.white;
    this.door({ hx: 0.8, hz: 20.7, dir: 0, swing: 1, mat: oak, face: 1,
      plates: [{ txt: 'Jake Knight', sub: 'Senior Developer', y: 5.0 }, { txt: 'Noah Mann', sub: 'Junior Developer', y: 4.15 }] });
    this.door({ hx: 21.7, hz: 20.7, dir: Math.PI, swing: -1, mat: oak, face: -1,
      plates: [{ txt: 'Sam Acton', sub: 'Research and Development', y: 4.6 }] });
    this.door({ hx: -0.2, hz: 25.9, dir: Math.PI / 2, swing: 1, mat: steelDoor });             // RMA west end
    this.door({ hx: 22.7, hz: 25.9, dir: Math.PI / 2, swing: -1, mat: steelDoor });            // RMA east end
    this.door({ hx: -0.2, hz: 5.5, dir: Math.PI / 2, swing: 1, mat: steelDoor });              // standup area (placeholder)
    // ceilings
    const ceil = (x0, z0, x1, z1) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(Math.PI / 2);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0));
      const mesh = new THREE.Mesh(g, m.ceiling); mesh.position.set((x0 + x1) / 2, H, (z0 + z1) / 2);
      mesh.receiveShadow = false; this.ceilings.add(mesh);
    };
    ceil(0, OZ0, PX0, 20.5); ceil(PX1, OZ0, 22.5, 20.5); ceil(0, LABZ0, 22.5, LABZ1); ceil(0, 0, 22.5, 8.1);
    this.labelData = [
      { txt: 'Development Office', sub: '12′ × 12′ · Jake Knight, Noah Mann', pos: new THREE.Vector3(6, 9.2, 8.3) },
      { txt: 'R&D Office', sub: '10′ × 12′ · Sam Acton', pos: new THREE.Vector3(17.4, 9.2, 8.3) },
      { txt: 'Standup Meeting Area', sub: '22.5′ × 8′ · shared with steel company', pos: new THREE.Vector3(11.25, 9.2, 0) },
      { txt: 'RMA / Test Lab', sub: '7′ × 22.5′ · 158 sq ft', pos: new THREE.Vector3(11.25, 6, 28.4) },
    ];
  }

  /* ---------------------------------------------------------- lighting */
  buildLighting() {
    const sc = this.scene, m = this.m;
    sc.add(new THREE.HemisphereLight(0xdfe8f5, 0x6c6358, 0.3));
    const fixture = (x, z, w = 4, d = 2) => {
      this.B(w, 0.14, d, m.trim, x, H - 0.08, z, this.ceilings, { cast: false, recv: false });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.3).rotateX(Math.PI / 2), m.light);
      p.position.set(x, H - 0.16, z); this.ceilings.add(p);
    };
    const spot = (x, z, intensity, angle = 1.15, y = H - 0.4, far = 40) => {
      const s = new THREE.SpotLight(0xfff1de, intensity, far, angle, 0.95, 1.6);
      s.position.set(x, y, z); s.target.position.set(x, 0, z);
      s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.04;
      s.shadow.camera.near = 0.5; s.shadow.camera.far = 24; s.shadow.radius = 4;
      sc.add(s, s.target);
    };
    [2.9, 7.1, 11.25, 15.4, 19.6].forEach((x) => { fixture(x, 23.7); fixture(x, 4.0); });
    [5.6, 16.9].forEach((x) => { spot(x, 24.0, 100, 1.35); spot(x, 4.0, 100, 1.35); });
    for (const [cx, xs] of [[6, [3, 9]], [17.45, [14.9, 20.0]]]) {
      for (const x of xs) for (const z of [11.2, 14.5, 17.8]) fixture(x, z);
      spot(cx, 14.5, 190, 1.3, H - 0.4, 60);
    }
    // landings get a soft work light
    for (const x of [-4.5, 27.4]) { const l = new THREE.PointLight(0xfff0dd, 90, 30, 1.6); l.position.set(x, 11, 24.4); sc.add(l); }
  }

  /* ---------------------------------------------------------- exterior */
  buildExterior() {
    const m = this.m, root = this.root;
    // shop floor far below + support columns -> the mezzanine reads as a raised deck
    this.R(-70, -18.2, -50, 90, -18, 90, m.shopFloor, root, { cast: false });
    const col = (x, z) => this.R(x - 0.3, -18, z - 0.3, x + 0.3, -1, z + 0.3, m.beam, root, { recv: false });
    [[-0.2, -0.2], [22.7, -0.2], [-0.2, 28.1], [22.7, 28.1], [11.25, 28.1], [11.25, -0.2], [-8.7, 19.2], [-8.7, 29.3], [31.7, 19.2], [31.7, 29.3]].forEach(([x, z]) => col(x, z));
    // landings on either side of the lab doors
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -9 : 22.9 + 0, x1 = side < 0 ? -T : 31.9;
      const xa = side < 0 ? -9 : 22.9, xb = side < 0 ? -0.4 : 31.9;
      const zS = side < 0 ? -0.4 : 19;
      this.R(xa, -0.9, zS, xb, 0, 29.5, m.osb, root, { cast: false });
      // far wall + side wall of corrugated metal (the existing building)
      const fx = side < 0 ? -9.2 : 31.9;
      this.R(fx, 0, zS, fx + 0.3, 14, 29.6, m.corrugated, root);
      this.addCollider(fx, zS, fx + 0.3, 29.6);
      this.R(Math.min(xa, xb), 0, zS - 0.2, Math.max(xa, xb), 14, zS, m.corrugated, root);
      this.addCollider(xa, zS - 0.2, xb, zS);
      this.walls.push({ x0: xa, z0: zS - 0.2, x1: xb, z1: zS + 0.1 }, { x0: fx, z0: zS, x1: fx + 0.3, z1: 29.6 });
      // guard rail on the open (front) side
      const rail = (x0r, x1r) => {
        this.R(x0r, 3.4, 29.4, x1r, 3.55, 29.55, m.steel, root);
        this.R(x0r, 1.8, 29.43, x1r, 1.92, 29.52, m.steel, root);
      };
      rail(xa, xb);
      for (let x = xa; x <= xb + 0.01; x += 3.0) this.R(x - 0.06, 0, 29.4, x + 0.06, 3.55, 29.55, m.steel, root);
      this.addCollider(xa, 29.3, xb, 29.7);
      this.walls.push({ x0: xa, z0: 29.4, x1: xb, z1: 29.6 });
    }
    // roof deck + rafters over the landings and rooms (hidden in overview)
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(60, 40).rotateX(Math.PI / 2), m.roof);
    roof.position.set(11.25, 14, 12); this.roof.add(roof);
    for (let x = -9; x <= 32; x += 6) {
      this.R(x - 0.2, 12.8, -8, x + 0.2, 14, 32, m.beam, this.roof);
    }
    for (const z of [-4, 6, 16, 26]) this.R(-11, 13.2, z - 0.15, 34, 13.6, z + 0.15, m.beam, this.roof);
    const lampMat = m.light;
    for (const x of [-4.5, 27.4]) { const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 20), lampMat); lamp.position.set(x, 13.7, 24.4); this.roof.add(lamp); }
  }

  // Merge every static mesh that shares a material into one draw call.
  finalize() {
    this.root.updateMatrixWorld(true);
    const skip = (o) => {
      for (let p = o; p && p !== this.root; p = p.parent) {
        if (p.userData.dynamic || p === this.ceilings || p === this.roof || p === this.labels) return true;
      }
      return false;
    };
    const buckets = new Map(), dead = [];
    this.root.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || skip(o)) return;
      const key = `${o.material.uuid}|${+o.castShadow}${+o.receiveShadow}`;
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
      buckets.get(key).list.push(g); dead.push(o);
    });
    dead.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
    for (const b of buckets.values()) {
      const geo = mergeGeometries(b.list, false);
      b.list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      this.root.add(mesh);
    }
  }

  setCeilings(on) { this.ceilings.visible = on; }
  setRoof(on) { this.roof.visible = on; }
}
