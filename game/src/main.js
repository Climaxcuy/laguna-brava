// LAGUNA BRAVA — main glue: scene, golden-hour grade, fixed-timestep loop, player, crew, wanted.
import { WEAPONS, EXPORT_CARS } from './config.js';
import { rng } from './rng.js';
import { initInput, keys, consume, endFrame, firing } from './input.js';
import { initAudio, sfx } from './audio.js';
import { buildWorld, districtAt, setSky, RAMPS, JUGS } from './world.js';
import { Traffic, driveCar } from './vehicles.js';
import { Airboat } from './airboat.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { Hud } from './hud.js';
import { drawMinimap, drawFullMap } from './minimap.js';
import { renderTitleSlots, renderStats } from './menus.js';
import { Autopilot } from './autopilot.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1600);
const sun = new THREE.DirectionalLight(0xffb36b, 2.2);
sun.position.set(-160, 55, 120); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -160; sun.shadow.camera.right = 160; sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
scene.add(sun); scene.add(new THREE.AmbientLight(0x8a6a9a, 0.75));
const moon = new THREE.DirectionalLight(0x7a9aff, 0); moon.position.set(80, 120, -60); scene.add(moon);
setSky(scene, false, 0);

const world = buildWorld(scene);

// Player avatar
const player = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.42), new THREE.MeshLambertMaterial({ color: 0xe0a51e })); body.position.y = 1.05; body.castShadow = true; player.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 10), new THREE.MeshLambertMaterial({ color: 0xc98a5e })); head.position.y = 1.88; player.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.14, 10), new THREE.MeshLambertMaterial({ color: 0x5d4020 })); hat.position.y = 2.08; player.add(hat);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.36), new THREE.MeshLambertMaterial({ color: 0x24303e })); legs.position.y = 0.28; player.add(legs);
}
player.position.set(-288, 0, 196); scene.add(player);

const G = {
  playerPos: player.position, playerAngle: 2.6, mode: 'foot', car: null, speedNow: 0,
  cash: 250, respect: 10, hp: 100, armor: 60, wanted: 0, wantedVisible: false, inSpotlight: false,
  weapon: 2, ammo: WEAPONS.map(w => typeof w.ammo === 'number' ? w.ammo : '∞'),
  crewCd: [0, 0, 0], boostT: 0, radioIdx: 0, trackIdx: 0, clockMin: 18 * 60 + 24 - 360, day: 1, night: false,
  tick: 0, district: 'Puerto Lodo', promptText: '', missionIndex: 0, missionState: null,
  stuntsDone: 0, exportsDone: 0, jugs: 0, completedMissions: {}, rng, sfx,
  stats: { missionsDone: 0, shots: 0, hits: 0, stolen: 0, slides: 0, earned: 0, timeMin: 0 },
  started: false, shotMode: 0, autopilot: !!params.get('autopilot'), firingHeld: false, camMode: 'follow', drawMapNow: false,
};
G.firingNow = false;
G.traffic = new Traffic(scene);
G.boat = new Airboat(scene);
G.peds = new Pedestrians(scene);
G.police = new Police(scene);
const hud = new Hud(G);
G.feed = (m) => hud.feed(m); G.showDialogue = (...a) => hud.showDialogue(...a);
G.showBanner = (...a) => hud.showBanner(...a); G.printout = (t) => hud.printout(t);
G.combat = new Combat(scene, G);
G.missions = new Missions(G);
G.renderStats = () => renderStats(G);
G.missionTarget = null;
G.addWanted = (n, msg) => { const before = G.wanted; G.wanted = Math.min(5, G.wanted + n); if (msg) G.feed('🚨 ' + msg); if (G.wanted > before) G.feed(`⭐ Wanted level ${G.wanted} — Patrulla Estatal dispatching ${G.police.neededUnits(G.wanted)} units`); G.searchT = 0; };
G.damagePlayer = (n) => { if (G.armor > 0) { const a = Math.min(G.armor, n); G.armor -= a; n -= a; } G.hp -= n; if (G.hp <= 0) { G.hp = 100; G.armor = 30; G.wanted = 0; G.playerPos.set(-288, 0, 196); G.mode = 'foot'; G.feed('🏥 WASTED — patched up at Puerto Lodo clinic, -$0 (Tío covers it)'); } };
G.enterCar = (c, silent) => {
  G.mode = 'car'; G.car = { mesh: c.mesh, speed: 0, angle: c.mesh.rotation.y, name: c.name, cond: c.cond ?? 100, ref: c };
  player.visible = false;
  if (!silent && !c.stolen) { c.stolen = true; G.stats.stolen++; sfx.steal(); if (G.peds.witnessCrime(c.mesh.position, G)) G.addWanted(1, 'Witness call — vehicle theft reported'); G.feed('🚗 STOLEN: ' + (c.name || 'car')); }
};
G.exitCar = () => { if (!G.car) return; G.car.ref.cond = G.car.cond; G.playerPos.set(G.car.mesh.position.x + 2.4, 0, G.car.mesh.position.z); G.car = null; G.mode = 'foot'; player.visible = true; };
G.boardBoat = () => { G.mode = 'boat'; G.boat.aboard = true; player.visible = false; G.feed('🛶 Aboard the airboat — fan up!'); };
G.exitBoat = () => { G.mode = 'foot'; G.boat.aboard = false; G.playerPos.set(G.boat.pos.x + 3, 0, G.boat.pos.z); player.visible = true; };
G.crewAbility = (i) => {
  if (G.crewCd[i] > 0) return;
  if (i === 0) { G.boostT = 3; G.boat.boost = 2.1; if (G.car) G.car.speed *= 1.5; G.feed('🛠️ Nando — FAN BOOST!'); G.crewCd[i] = 20; }
  if (i === 1) { if (G.car) G.car.cond = 100; G.hp = Math.min(100, G.hp + 25); G.feed('🔧 Lupe — QUICK FIX: vehicle & vitals patched'); G.crewCd[i] = 25; }
  if (i === 2) { G.searchT = 999; G.wantedVisible = false; G.feed('🦅 Chuy — EYES OUT: police routes marked, heat cooling'); G.crewCd[i] = 18; }
  sfx.ui();
};
const autopilot = G.autopilot ? new Autopilot(G) : null;
if (G.autopilot) { G.started = true; document.getElementById('titleScreen').style.display = 'none'; }

initInput(); initAudio();
renderTitleSlots(G);
document.getElementById('startBtn').addEventListener('click', () => { G.started = true; document.getElementById('titleScreen').style.display = 'none'; initAudio(); sfx.ui(); G.showDialogue('🧔🏽', 'Tío Braulio Fuentes', 'Swamp Patriarch', MISSIONS_INTRO); });
const MISSIONS_INTRO = 'Welcome to Laguna Brava, mijo. Airboat first — the swamp provides.';
document.getElementById('closeMap').addEventListener('click', () => document.getElementById('mapScreen').style.display = 'none');
document.getElementById('closeStats').addEventListener('click', () => document.getElementById('statsScreen').style.display = 'none');
if (params.get('shot')) setupShot(G, +params.get('shot'));

let searchT = 0; G.searchT = 0;
function step(dt) {
  G.tick++;
  G.clockMin += dt * 1.2; G.stats.timeMin += dt / 60;
  if (G.clockMin > 24 * 60) { G.clockMin -= 24 * 60; G.day++; }
  for (let i = 0; i < 3; i++) G.crewCd[i] = Math.max(0, G.crewCd[i] - dt);
  if (G.boostT > 0) { G.boostT -= dt; if (G.boostT <= 0) G.boat.boost = 1; }
  const input = { fwd: keys['KeyW'] || keys['ArrowUp'], back: keys['KeyS'] || keys['ArrowDown'], steer: (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) + (keys['KeyD'] || keys['ArrowRight'] ? -1 : 0) };
  G.firingNow = firing() || G.firingHeld;
  if (autopilot) autopilot.step();

  // Mode movement
  if (G.mode === 'foot') {
    let dx = 0, dz = 0;
    if (input.fwd) dz -= 1; if (input.back) dz += 1; if (keys['KeyA']) dx -= 1; if (keys['KeyD']) dx += 1;
    const camA = G.playerAngle;
    const fx = Math.sin(camA), fz = Math.cos(camA);
    const mx = fx * -dz + fz * dx, mz = fz * -dz - fx * dx;
    const sp = (keys['ShiftLeft'] ? 10 : 5.6) * dt, len = Math.hypot(mx, mz) || 1;
    if (dx || dz) { G.playerPos.x += mx / len * sp; G.playerPos.z += mz / len * sp; G.playerAngle = Math.atan2(mx, mz); }
    for (const c of world.colliders) { const d = Math.hypot(G.playerPos.x - c.x, G.playerPos.z - c.z); if (d < c.r + 0.8) { const push = (c.r + 0.8 - d) || 0; G.playerPos.x += (G.playerPos.x - c.x) / (d || 1) * push; G.playerPos.z += (G.playerPos.z - c.z) / (d || 1) * push; } }
    G.playerPos.x = Math.max(-580, Math.min(580, G.playerPos.x)); G.playerPos.z = Math.max(-430, Math.min(430, G.playerPos.z));
    player.position.y = (dx || dz) ? Math.abs(Math.sin(G.tick * 0.22)) * 0.09 : 0;
    player.rotation.y = G.playerAngle; G.speedNow = (dx || dz) ? 1.6 : 0;
  } else if (G.mode === 'car' && G.car) {
    G.speedNow = driveCar(G.car, { fwd: input.fwd, back: input.back, steer: -input.steer }, dt);
    G.playerPos.copy(G.car.mesh.position); G.playerAngle = G.car.angle;
    if (Math.abs(G.speedNow) > 20 && G.tick % 90 === 0) G.car.cond = Math.max(5, G.car.cond - 0.4);
    sfx.engine(G.speedNow, false);
  } else if (G.mode === 'boat') {
    G.speedNow = G.boat.update(dt, { fwd: input.fwd, back: input.back, steer: input.steer }, rng);
    G.playerPos.copy(G.boat.pos); G.playerAngle = G.boat.angle;
    if (G.speedNow > 4) G.stats.slides++;
    sfx.engine(G.speedNow * 2, true);
  }
  if (G.mode !== 'boat') G.boat.update(dt, { fwd: false, back: false, steer: 0 }, rng);

  // Interactions
  G.promptText = '';
  const nearCar = G.mode === 'foot' ? G.traffic.nearestStealable(G.playerPos, 6) : null;
  const nearBoat = G.mode === 'foot' && G.boat.pos.distanceTo(G.playerPos) < 7;
  if (nearCar) G.promptText = 'E — STEAL · ' + (nearCar.name || 'car');
  if (nearBoat) G.promptText = 'E — BOARD AIRBOAT';
  if (G.mode === 'car') G.promptText = Math.abs(G.speedNow) < 2 ? 'E — EXIT VEHICLE' : '';
  if (G.mode === 'boat') G.promptText = G.boat.beached ? 'E — STEP OFF (beached on mud)' : 'E — DISEMBARK';
  if (consume('KeyE')) {
    if (G.mode === 'foot' && nearBoat) G.boardBoat();
    else if (G.mode === 'foot' && nearCar) G.enterCar(nearCar);
    else if (G.mode === 'car' && Math.abs(G.speedNow) < 3) G.exitCar();
    else if (G.mode === 'boat' && G.speedNow < 3) G.exitBoat();
  }
  if (consume('KeyZ')) G.crewAbility(0);
  if (consume('KeyX')) G.crewAbility(1);
  if (consume('KeyC')) G.crewAbility(2);
  if (consume('KeyN')) { G.night = !G.night; G.feed(G.night ? '🌙 Night mode' : '🌇 Golden hour'); }
  if (consume('KeyR')) { G.radioIdx = (G.radioIdx + 1) % 2; G.trackIdx++; sfx.ui(); }
  for (let i = 0; i < 7; i++) if (consume('Digit' + (i + 1))) G.weapon = i;
  if (consume('KeyM')) { const el = document.getElementById('mapScreen'); const open = el.style.display !== 'block'; el.style.display = open ? 'block' : 'none'; if (open) G.drawMapNow = true; }
  if (consume('KeyP') || consume('Tab')) { const el = document.getElementById('statsScreen'); const open = el.style.display !== 'block'; el.style.display = open ? 'block' : 'none'; if (open) renderStats(G); }

  // Systems
  G.traffic.update(dt); G.peds.update(dt, G.playerPos);
  G.police.update(dt, G); sfx.siren(G.wanted > 0);
  G.wantedVisible = G.police.units.some(u => u.active && u.dist < 42) || G.inSpotlight;
  if (G.wanted > 0) { if (G.wantedVisible) G.searchT = 0; else { G.searchT += dt; if (G.searchT > 14) { G.wanted--; G.searchT = 0; G.feed('⭐ Heat cooled — wanted ' + G.wanted); } } }
  G.combat.shoot(dt);
  G.missions.update();
  const st = G.missionState && !G.missionState.done ? G.missionState.mission.stages[G.missionState.stage] : null;
  G.missionTarget = st ? { x: st.x, z: st.z } : null;
  if (world.marker) { const vis = !!st; world.marker.ring.visible = vis; world.marker.pillar.visible = vis; if (st) { world.marker.ring.position.set(st.x, 0.6, st.z); world.marker.pillar.position.set(st.x, 20, st.z); } }
  // Stunts
  for (const r of RAMPS) { if (!r.done && (G.mode === 'car' || G.mode === 'boat') && Math.abs(G.speedNow) > 13 && Math.hypot(G.playerPos.x - r.x, G.playerPos.z - r.z) < 6) { r.done = true; G.stuntsDone++; G.cash += 150; G.stats.earned += 150; sfx.stunt(); G.printout(`🏁 STUNT ${G.stuntsDone}/12 — Ramp #${r.id} CLEARED · +$150 · Airtime ${(Math.abs(G.speedNow) * 0.09).toFixed(1)}s`); } }
  // Jugs
  for (const j of JUGS) { if (!j.taken && G.playerPos.distanceTo(j.mesh.position) < 2.6) { j.taken = true; j.mesh.visible = false; G.jugs++; G.cash += 40; G.printout(`🍶 MOONSHINE JUG ${G.jugs}/15 · +$40`); sfx.cash(); } }
  // Exports at Faros Point dock
  if (G.mode === 'car' && G.car && Math.hypot(G.playerPos.x - 430, G.playerPos.z + 260) < 13) {
    if (G.car.name === EXPORT_CARS[G.exportsDone % 10]) { G.exportsDone++; G.cash += 1200; G.stats.earned += 1200; G.printout(`🏆 EXPORT DELIVERED: ${G.car.name} · +$1,200 · ${G.exportsDone}/10`); G.feed('🏆 Export list updated at Faros Point dock'); sfx.cash(); G.car.name = 'Delivered'; }
  }
  G.district = districtAt(G.playerPos.x, G.playerPos.z).name;
  // Sky / lights
  setSky(scene, G.night, G.tick * 0.016);
  sun.intensity = G.night ? 0.12 : 2.2; moon.intensity = G.night ? 0.7 : 0;
  sun.position.set(G.playerPos.x - 160, G.night ? 140 : 55, G.playerPos.z + 120);
  sun.target.position.copy(G.playerPos); scene.add(sun.target);
  if (world.lighthouseLamp) world.lighthouseLamp.material.color.setHex(G.night ? 0xffe98a : 0xfff6c8);

  // Camera
  const back = G.camMode === 'chaseLow' ? 8.5 : G.mode === 'car' ? 11 : G.mode === 'boat' ? 12 : 8;
  const hgt = G.camMode === 'chaseLow' ? 2.0 : G.mode === 'foot' ? 4.2 : 3.4;
  const cx = G.playerPos.x - Math.sin(G.playerAngle) * back, cz = G.playerPos.z - Math.cos(G.playerAngle) * back;
  camera.position.lerp(new THREE.Vector3(cx, hgt, cz), G.shotMode ? 1 : 0.12);
  camera.lookAt(G.playerPos.x + Math.sin(G.playerAngle) * 6, 1.6, G.playerPos.z + Math.cos(G.playerAngle) * 6);
  hud.update(); drawMinimap(G);
  if (G.drawMapNow) { drawFullMap(G); }
  endFrame();
}

let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!G.started) { renderer.render(scene, camera); return; }
  acc += dt; const h = 1 / 60;
  while (acc >= h) { step(h); acc -= h; }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
