// World building: frontier city, swamp channels, interstate, districts, ramps, props.
import { DISTRICTS } from './config.js';
import { rng, rr } from './rng.js';

export const RAMPS = [];
export const JUGS = [];
export const CHANNEL = { x0: 285, x1: 375, z0: 40, z1: 330 }; // swamp water channel

function canvasTex(draw, w = 128, h = 128) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); return t;
}
export function buildingTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#4a3a44'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 16) for (let x = 8; x < w - 8; x += 14) {
      g.fillStyle = rng() > 0.45 ? '#ffd98a' : '#2a2438'; g.fillRect(x, y, 9, 11);
    }
  });
}
export function groundTexture(base, fleck) {
  return canvasTex((g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = fleck; g.globalAlpha = rng() * 0.25; g.fillRect(rng() * w, rng() * h, 3, 3); }
  }, 256, 256);
}

export function buildWorld(scene) {
  const W = { colliders: [], markers: [] };
  const groundTex = groundTexture('#5d7038', '#2e4420'); groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(24, 18);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Swamp water channel + lakes
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x1d4d4a, shininess: 90, transparent: true, opacity: 0.92 });
  const channel = new THREE.Mesh(new THREE.PlaneGeometry(CHANNEL.x1 - CHANNEL.x0, CHANNEL.z1 - CHANNEL.z0), waterMat);
  channel.rotation.x = -Math.PI / 2; channel.position.set((CHANNEL.x0 + CHANNEL.x1) / 2, 0.15, (CHANNEL.z0 + CHANNEL.z1) / 2); scene.add(channel);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(85, 24), waterMat);
  lake.rotation.x = -Math.PI / 2; lake.position.set(430, 0.15, 300); scene.add(lake);
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(360, 200), new THREE.MeshPhongMaterial({ color: 0x1d5d6e, shininess: 90 }));
  bay.rotation.x = -Math.PI / 2; bay.position.set(470, 0.12, -330); scene.add(bay);
  W.water = [channel, lake];

  // Mud banks along channel
  const mudMat = new THREE.MeshLambertMaterial({ color: 0x6e5230 });
  for (const bx of [CHANNEL.x0 - 6, CHANNEL.x1 + 6]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, CHANNEL.z1 - CHANNEL.z0), mudMat);
    bank.position.set(bx, 0.4, (CHANNEL.z0 + CHANNEL.z1) / 2); scene.add(bank);
  }

  // Roads: interstate (long, east-west at z=-40) + city streets
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  function road(x, z, w, l, horiz = true) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? l : w, horiz ? w : l), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.06, z); scene.add(r);
    for (let i = -l / 2 + 8; i < l / 2 - 4; i += 16) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? 7 : 1.2, horiz ? 1.2 : 7), dashMat);
      d.rotation.x = -Math.PI / 2; d.position.set(horiz ? x + i : x, 0.09, horiz ? z : z + i); scene.add(d);
    }
  }
  road(0, -40, 26, 1180, true); // THE INTERSTATE
  road(-320, 60, 14, 560, false); road(-160, 220, 14, 620, true); road(-320, -100, 14, 380, false);
  road(120, 160, 12, 480, false); road(430, -120, 14, 380, false); road(-60, -260, 14, 700, true);
  W.roads = [{ x: 0, z: -40, w: 26, horiz: true }, { x: -320, z: 60, w: 14, horiz: false }, { x: 120, z: 160, w: 12, horiz: false }, { x: 430, z: -120, w: 14, horiz: false }, { x: -160, z: 220, w: 14, horiz: true }, { x: -60, z: -260, w: 14, horiz: true }];

  // Buildings in Puerto Lodo, Villa Ceniza, Faros Point
  const bTex = buildingTexture();
  const centers = [[-320, 220], [-300, -260], [430, -280], [-160, 300]];
  for (const [cx, cz] of centers) for (let i = 0; i < 16; i++) {
    const h = rr(10, 42), w = rr(10, 18);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshLambertMaterial({ map: bTex, emissive: 0x664411, emissiveIntensity: 0.35 }));
    const bx = cx + rr(-85, 85), bz = cz + rr(-70, 70);
    if (Math.abs(bz + 40) < 24 || Math.abs(bx - CHANNEL.x0) < 20) continue;
    b.position.set(bx, h / 2, bz); b.castShadow = true; scene.add(b);
    W.colliders.push({ x: bx, z: bz, r: w * 0.75 });
  }
  // Lighthouse at Faros Point
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 34, 10), new THREE.MeshLambertMaterial({ color: 0xf2e8d8, emissive: 0x333322 }));
  lh.position.set(455, 17, -300); scene.add(lh);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe98a }));
  lamp.position.set(455, 36, -300); scene.add(lamp); W.lighthouseLamp = lamp;

  // Cypress-like swamp trees + palms
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e5d33 });
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x5d7038 });
  for (let i = 0; i < 130; i++) {
    const inSwamp = i < 80;
    const tx = inSwamp ? rr(240, 520) : rr(-560, 560), tz = inSwamp ? rr(30, 400) : rr(-400, 400);
    if (tx > CHANNEL.x0 - 14 && tx < CHANNEL.x1 + 14 && tz > CHANNEL.z0 - 10 && tz < CHANNEL.z1 + 10) continue;
    const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, rr(7, 12), 6), trunkMat); trunk.position.y = 5; trunk.castShadow = true; tr.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(rr(3.5, 6), rr(6, 10), 7), inSwamp ? mossMat : leafMat); crown.position.y = 12; crown.castShadow = true; tr.add(crown);
    tr.position.set(tx, 0, tz); scene.add(tr);
  }
  // District signs
  for (const d of DISTRICTS) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = '#20301c'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#ffd98a'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText(d.name.toUpperCase(), 128, 40);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide }));
    sign.position.set(d.x, 7, d.z + d.r * 0.5); scene.add(sign);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7), trunkMat); pole.position.set(d.x, 3.5, d.z + d.r * 0.5); scene.add(pole);
  }
  // 12 stunt ramps
  const rampMat = new THREE.MeshLambertMaterial({ color: 0xd86a20 });
  const rampSpots = [[-80, -40], [140, -40], [-320, -20], [60, 160], [430, -60], [-160, 160], [240, 300], [-420, 220], [-60, -200], [200, -260], [-320, -340], [500, -180]];
  rampSpots.forEach(([x, z], i) => {
    const geo = new THREE.BoxGeometry(8, 3, 10); const m = new THREE.Mesh(geo, rampMat);
    m.position.set(x, 1.2, z); m.rotation.x = -0.42; scene.add(m);
    RAMPS.push({ x, z, id: i + 1, done: false, mesh: m });
  });
  // Moonshine jug collectibles
  const jugMat = new THREE.MeshPhongMaterial({ color: 0xd8c9a0, shininess: 60 });
  for (let i = 0; i < 15; i++) {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 1.4, 8), jugMat);
    j.position.set(rr(-520, 540), 0.8, rr(-380, 380)); scene.add(j); JUGS.push({ mesh: j, taken: false });
  }
  // Objective marker (gold pillar + ring)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.5, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; scene.add(ring);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 8), new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.3 }));
  pillar.position.y = 20; scene.add(pillar);
  W.marker = { ring, pillar };
  // Swamp dock
  const dock = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 10), new THREE.MeshLambertMaterial({ color: 0x7a5c36 }));
  dock.position.set(292, 0.5, 306); scene.add(dock);
  return W;
}
export function districtAt(x, z) {
  let best = DISTRICTS[0], bd = 1e9;
  for (const d of DISTRICTS) { const dist = Math.hypot(x - d.x, z - d.z); if (dist < bd) { bd = dist; best = d; } }
  return best;
}
export function inChannel(x, z) { return x > CHANNEL.x0 && x < CHANNEL.x1 && z > CHANNEL.z0 && z < CHANNEL.z1; }
export function setSky(scene, night, t) {
  if (night) {
    scene.background = new THREE.Color(0x0b1026);
    scene.fog = new THREE.Fog(0x0b1026, 120, 700);
  } else {
    const c = new THREE.Color().setHSL(0.07 + 0.03 * Math.sin(t * 0.01), 0.65, 0.55);
    scene.background = c; scene.fog = new THREE.Fog(0xe8906a, 140, 780);
  }
}
