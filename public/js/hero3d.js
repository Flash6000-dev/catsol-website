/* CATSOL — hero scene
   An exploded fabricated sheet-metal assembly (door, shell, mounting plate, angle sections and
   laser-cut parts) with the RFQ → delivery workflow drawn through it as a connected path.
   Purely illustrative: it depicts fabrication work in general, not a specific product line.
   One small WebGL scene: pauses off-screen / hidden tab, renders a single static frame
   under prefers-reduced-motion, and the page falls back to an SVG line drawing without WebGL. */
import * as THREE from '../vendor/three.module.min.js';

const gl = document.getElementById('heroGl');
const canvas = document.getElementById('heroCanvas');
const hero = document.getElementById('top');
const reduced = document.documentElement.classList.contains('reduced');
const tagEls = Array.from(gl.querySelectorAll('.hero__tags li'));

const C = { primary: 0x00bdd6, cyan: 0x00d4ff, teal: 0x17cfa0, bg: 0x0c0e12, fill: 0x101c27 };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.bg, 0.045);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0x8fdcff, 0x0a1118, 0.9));
  const key = new THREE.DirectionalLight(0xbff6ff, 1.6); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(C.cyan, 26, 14, 1.6); rim.position.set(-3.5, 1.5, 3); scene.add(rim);

  /* ---- helpers ---- */
  const fillMat = (opacity) => new THREE.MeshStandardMaterial({ color: C.fill, metalness: 0.78, roughness: 0.4, transparent: true, opacity, side: THREE.DoubleSide });
  const edgeMat = (opacity = 0.9) => new THREE.LineBasicMaterial({ color: C.primary, transparent: true, opacity });
  function solid(geo, opacity = 0.9, edgeOpacity = 0.9) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, fillMat(opacity)));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), edgeMat(edgeOpacity)));
    return g;
  }
  function plate(w, h, d, holes = []) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
    holes.forEach((hl) => s.holes.push(hl));
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -d / 2);
    return geo;
  }
  const circleHole = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };
  const rrHole = (cx, cy, w, h, r) => {
    const p = new THREE.Path(); const x = cx - w / 2, y = cy - h / 2;
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p;
  };
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(160,250,255,1)'); g.addColorStop(0.25, 'rgba(0,212,255,.55)'); g.addColorStop(1, 'rgba(0,189,214,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const halo = (size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); return s;
  };

  /* ---- panel ---- */
  const panel = new THREE.Group();
  scene.add(panel);

  // mounting plate with a perforation grid
  const perf = [];
  for (let ix = -4; ix <= 4; ix++) for (let iy = -6; iy <= 6; iy++) if ((ix + iy) % 2 === 0) perf.push(circleHole(ix * 0.32, iy * 0.3, 0.035));
  const back = solid(plate(3.0, 4.0, 0.05, perf), 0.92, 0.55);
  panel.add(back);

  // internals: angle sections carrying laser-cut parts
  const internals = new THREE.Group();
  panel.add(internals);
  const rows = [];
  [1.3, 0.1, -1.1].forEach((y, r) => {
    const row = new THREE.Group(); row.position.y = y; internals.add(row); rows.push(row);
    const web = solid(new THREE.BoxGeometry(2.5, 0.12, 0.05), 1, 0.9); web.position.z = 0.08; row.add(web);
    const flange = solid(new THREE.BoxGeometry(2.5, 0.05, 0.22), 1, 0.9); flange.position.set(0, -0.035, 0.18); row.add(flange);
    let x = -1.18; const n = r === 1 ? 7 : 8;
    for (let i = 0; i < n; i++) {
      const w = r === 1 ? 0.3 : 0.24; const h = 0.5 + ((i * 7 + r * 3) % 4) * 0.045;
      const holes = [circleHole(0, h * 0.18, 0.04)];
      if ((i + r) % 2 === 0) holes.push(rrHole(0, -h * 0.12, w * 0.5, 0.07, 0.03));
      const part = solid(plate(w, h, 0.12, holes), 0.95, 0.85);
      part.position.set(x + w / 2, h / 2 - 0.05, 0.3); row.add(part);
      x += w + 0.028;
      if (x > 1.2) break;
    }
  });
  [1.8, -1.8].forEach((y) => { const bar = solid(new THREE.BoxGeometry(2.7, 0.2, 0.26), 0.9, 0.7); bar.position.set(0, y, 0.16); internals.add(bar); });

  // shell: sides, top, bottom
  const left = solid(new THREE.BoxGeometry(0.05, 4.0, 1.0), 0.5, 0.9);
  const right = solid(new THREE.BoxGeometry(0.05, 4.0, 1.0), 0.5, 0.9);
  const top = solid(new THREE.BoxGeometry(3.1, 0.05, 1.0), 0.5, 0.9);
  const bottom = solid(new THREE.BoxGeometry(3.1, 0.05, 1.0), 0.5, 0.9);
  [left, right, top, bottom].forEach((m) => panel.add(m));

  // door with a window and a row of laser-cut slots
  const doorHoles = [rrHole(0, 0.5, 1.9, 2.2, 0.12)];
  for (let i = 0; i < 7; i++) doorHoles.push(rrHole(-0.66 + i * 0.22, -1.55, 0.12, 0.34, 0.02));
  const door = solid(plate(3.1, 4.1, 0.05, doorHoles), 0.42, 0.95);
  panel.add(door);

  /* ---- workflow path ---- */
  const flow = new THREE.Group(); panel.add(flow);
  const nodePts = [
    new THREE.Vector3(-1.2, 1.55, 0.62), new THREE.Vector3(-0.35, 0.95, 0.8), new THREE.Vector3(0.55, 1.35, 0.66),
    new THREE.Vector3(0.9, 0.25, 0.82), new THREE.Vector3(-0.2, -0.5, 0.72), new THREE.Vector3(0.85, -1.4, 0.66),
  ];
  const curve = new THREE.CatmullRomCurve3(nodePts, false, 'catmullrom', 0.5);
  flow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.013, 6, false), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.95 })));
  const nodeObjs = nodePts.map((p) => {
    const n = new THREE.Group(); n.position.copy(p);
    n.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xbffbff })));
    n.add(halo(0.55, 0.85)); flow.add(n); return n;
  });
  const pulse = new THREE.Group();
  pulse.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  pulse.add(halo(0.9, 1)); flow.add(pulse);

  /* ---- atmosphere ---- */
  const N = 240; const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.2 + Math.random() * 3.2, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 6;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x7ff3ff, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);
  const grid = new THREE.GridHelper(16, 32, C.primary, 0x0b3a44);
  grid.position.y = -2.6; grid.material.transparent = true; grid.material.opacity = 0.32; scene.add(grid);

  /* ---- layout by viewport ---- */
  let narrow = false;
  function resize() {
    const w = gl.clientWidth, h = gl.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, narrowDpr());
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = camera.aspect < 0.95;
    camera.fov = narrow ? 34 : 30;
    camera.updateProjectionMatrix();
    if (reduced) draw(0);
  }
  const narrowDpr = () => (window.innerWidth < 700 ? 1.5 : 1.75);

  /* ---- animation state ---- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const v = new THREE.Vector3();
  const t0 = performance.now();

  function heroProgress() {
    if (reduced) return 0.5;
    const range = hero.offsetHeight - window.innerHeight;
    return range > 0 ? clamp(-hero.getBoundingClientRect().top / range) : 0;
  }

  function draw(t) {
    const p = heroProgress();
    const intro = reduced ? 1 : easeOut(clamp((performance.now() - t0) / 1900));
    const e = reduced ? 0.55 : intro * 0.14 + smooth(0.02, 0.92, p) * 0.96;

    // exploded view
    door.position.set(0, e * 0.12, 0.55 + e * 2.2); door.rotation.y = -e * 0.28;
    left.position.set(-1.55 - e * 1.25, 0, 0.5); right.position.set(1.55 + e * 1.25, 0, 0.5);
    top.position.set(0, 2.0 + e * 1.05, 0.5); bottom.position.set(0, -2.0 - e * 1.05, 0.5);
    back.position.z = -e * 0.85;
    internals.position.z = e * 0.2;
    rows.forEach((r, i) => { r.position.y = [1.3, 0.1, -1.1][i] + (1 - i) * e * 0.32; });
    flow.position.z = e * 0.85;

    // camera / group composition
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    const idle = reduced ? 0 : Math.sin(t * 0.25) * 0.06;
    panel.rotation.y = -0.62 + idle + pointer.x * 0.16 + p * 0.55;
    panel.rotation.x = 0.1 + pointer.y * 0.05 - p * 0.04;
    if (narrow) {
      // phone: panel sits low under the headline, then rises as the story caption appears
      const rise = reduced ? 0.85 : smooth(0.12, 0.7, p);
      panel.position.set(0, -1.65 + rise * 2.7, 0); panel.scale.setScalar(0.7);
      camera.position.set(0, 0.5, 12.8);
    } else {
      panel.position.set(2.15 - p * 1.0, 0, 0); panel.scale.setScalar(1);
      camera.position.set(0, 0.7, 11.2 - p * 1.8);
    }
    camera.lookAt(narrow ? 0 : 0.6, narrow ? 0.5 : 0, 0.3);

    // workflow pulse + dust
    if (!reduced) {
      pulse.position.copy(curve.getPointAt((t * 0.09) % 1));
      dust.rotation.y = t * 0.02;
    } else {
      pulse.position.copy(nodePts[3]);
    }

    renderer.render(scene, camera);

    // HTML labels pinned to workflow nodes
    const a = reduced ? 1 : smooth(0.5, 0.78, p);
    const w = gl.clientWidth, h = gl.clientHeight;
    tagEls.forEach((el, i) => {
      nodeObjs[i].getWorldPosition(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${(x + 14).toFixed(1)}px, ${(y - 12).toFixed(1)}px)`;
      el.style.opacity = a.toFixed(2);
    });
  }

  /* ---- loop control ---- */
  let raf = 0, visible = true;
  const loop = (now) => { raf = requestAnimationFrame(loop); draw(now / 1000); };
  const run = () => { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  new ResizeObserver(resize).observe(gl);
  resize();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? run() : stop(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));

  draw(0);
  gl.classList.add('is-live');
  run();
}

try {
  start();
} catch (err) {
  console.warn('[CATSOL] WebGL hero unavailable, using static fallback.', err);
  gl.classList.add('no-webgl');
}
