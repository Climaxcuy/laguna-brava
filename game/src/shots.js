// The four frames Laguna Brava is judged by. Each scene is staged from the real game state —
// real cars, real dispatch units, the real mission engine mid-job — then frozen: the point
// is not to fake a screenshot but to catch the game at its most truthful, dramatic instant.
//   chase   golden-hour pursuit on La Recta, the hero Charger huge in frame, the net closing
//   action  an airboat ambush at the Puerto Barro mooring, mid-tracer, debts collected
//   map     the full chart with the GPS thread running to Punta Faros and the ledger open
//   passed  MISSION PASSED over the airboat at Isla Tormenta, the season's money counted
// Every scene sets window.__shotReady via main.js after painting; staging errors surface in
// window.__errors so a broken scene can never pass silently.
//
// ROUND-2 REBUILDS (finisher session, on the user's order: a spec that breaks the
// composition is met by rebuilding the staging, never by forcing the frame):
//   chase  — round 1 framed the pack at zoom 5 from a camera the choreography had
//            outgrown: hero 20% of frame width, helicopter 10 px above the top edge,
//            the roadblock out of frame entirely. The whole net was re-choreographed
//            in hero-local coordinates around a closer camera (zoom 7.4): hero 33%,
//            four units and the helicopter inside the frame, distances honest.
//   action — round 1 staged the gunfight on top of a procedural stilthouse: the
//            rival stood inside its roof, the sedan and the police car hung off
//            the frame edges. Round 2's apron south of the Armería proved too
//            small — two roofs and the waterline ate the frame. The fight moved
//            to the game's signature ground: an airboat ambush on open water
//            at the Puerto Barro mooring.
//   passed — round 1's banner never appeared (staging set t 1.4 of dur 999, so the
//            banner's fade envelope sat at alpha 0.01) and the next job's mission
//            ring swallowed the dock. Banner timing fixed; the scene is staged
//            between jobs, when the marker rests across the basin and no ring
//            intrudes; the boat re-staged afloat off the west shore.

import { CAR_MODELS, DISPATCH_UNITS } from './config.js';
import { makeCar } from './vehicles.js';
import { makePed } from './peds.js';
import { dist } from './rng.js';

function mkCop(G, specIdx, x, y, angle, speed = 0) {
  const spec = DISPATCH_UNITS[specIdx];
  const car = makeCar(CAR_MODELS[2], x, y, angle, '#e9e6dd');
  car.driver = 'cop';
  car.police = true;
  car.speed = speed;
  car.name = 'Patrulla ' + spec.callsign;
  G.cars.push(car);
  G.police.units.push({ car, callsign: spec.callsign, role: spec.role, mode: 'hunt', blockPoint: null });
  return car;
}

/** Offset in a heading's local frame: dx along the nose, dy to its right. */
function rel(x, y, angle, dx, dy) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x + dx * c - dy * s, y: y + dx * s + dy * c };
}

function dustBehind(G, car, n, spread = 26) {
  const back = car.angle + Math.PI;
  for (let i = 0; i < n; i += 1) {
    G.particles.push({
      x: car.x + Math.cos(back) * (30 + i * 4) + G.rng.range(-spread, spread) * 0.4,
      y: car.y + Math.sin(back) * (30 + i * 4) + G.rng.range(-spread, spread) * 0.4,
      vx: Math.cos(back) * 34, vy: Math.sin(back) * 34,
      life: G.rng.range(0.05, 0.4), maxLife: 0.95, size: G.rng.range(1.2, 2.6),
      colour: 'rgba(206,186,152,0.22)', kind: 'smoke',
    });
  }
}

function sprayBehind(G, boat, n) {
  const back = boat.angle + Math.PI;
  for (let i = 0; i < n; i += 1) {
    G.particles.push({
      x: boat.x + Math.cos(back) * (20 + i * 2.4) + G.rng.range(-9, 9),
      y: boat.y + Math.sin(back) * (20 + i * 2.4) + G.rng.range(-9, 9),
      vx: Math.cos(back) * 60, vy: Math.sin(back) * 60,
      life: G.rng.range(0.04, 0.3), maxLife: 0.7, size: G.rng.range(3, 6.5),
      colour: 'rgba(232,246,246,0.55)', kind: 'spray',
    });
  }
}

function baseScene(G) {
  G.screen = 'play';
  G.dayHour = 17.62;
  G.forcedNight = false;
  G.weather.storm = 0;
  G.banner = null;
  G.prompt = null;
}

/** 1 — the cover: a 4-star golden-hour chase, hero car a third of the frame. */
function stageChase(G) {
  baseScene(G);
  // The job underneath: OJOS DEL CÓNDOR, stage one — hence the heat, hence the helicopter.
  G.missions.next = 10;
  G.missions.done = G.missions.done.map((_, i) => i < 10);
  G.stats.missionsDone = 10;
  G.player.cash = 12480;
  G.player.rep = 640;
  G.missions.startNext(G);

  const hero = G.cars.find((c) => c.exportId === 0) ?? makeCar(CAR_MODELS[0], 0, 0, 0, '#c8432b');
  if (!G.cars.includes(hero)) G.cars.push(hero);
  hero.x = 4300; hero.y = 652; hero.angle = -0.34; hero.speed = 238; hero.health = 82;
  hero.driver = 'player';
  hero.name = "Brava Charger '71";
  const p = G.player;
  p.mode = 'car';
  p.car = hero;
  p.x = hero.x; p.y = hero.y; p.angle = hero.angle;
  p.vx = Math.cos(hero.angle) * hero.speed;
  p.vy = Math.sin(hero.angle) * hero.speed;
  p.hp = 78;
  p.armour = 35;
  p.weapons[3].owned = true; p.weapons[3].ammo = 84;
  p.weapons[4].owned = true; p.weapons[4].ammo = 12;
  p.weapons[5].owned = true; p.weapons[5].ammo = 210;
  p.weaponSlot = 3;

  // The net, placed by SCREEN targets and converted to world coordinates
  // (camera 4304.7,647.2 at zoom 7.0 — the loosest zoom at which the hero's
  // 57-unit span still covers 31% of the frame width). Rounds 2 and 3 packed
  // the cast in hero-local offsets and produced a parking knot: at this zoom
  // a car is ~400 px, so every pair below was checked for rectangle clearance
  // in the hero's frame (|lateral| > 24.5 or |longitudinal| > 51) and for
  // frame margins on screen. Two pursuers staggered behind in opposite lanes,
  // the rammer door-to-door on the right quarter, the roadblock across the
  // road ahead, the spotter trailing out of frame with an honest distance on
  // the dispatch panel, the helicopter level across the top of the frame.
  // Round 4's screen targets were hit but the gaps were ~0 px — a sandwich,
  // not a chase. These positions keep the same targets with real road showing
  // between every pair of cars (checked in the hero's frame, see above).
  const b5 = mkCop(G, 0, 4244.0, 620.8, -0.3, 232);
  const b9 = mkCop(G, 1, 4247.6, 681.5, -0.38, 236);
  const sierra = mkCop(G, 2, 4360.4, 665.8, -0.3, 240);
  mkCop(G, 3, 4369.7, 626.5, 1.25, 0);
  G.police.units[3].mode = 'set';
  const lima = mkCop(G, 4, 4151.8, 683.2, -0.1, 210);
  void lima;

  G.police.stars = 4.2;
  G.police.sight = 'INSIGHT';
  G.police.lastSeen = { x: p.x, y: p.y };
  G.police.heli = { x: 4330.4, y: 595.1, angle: -0.15, rotor: 1.2, spot: 1 };
  G.police.log = ['BRAVO-5 (PURSUIT): ¡lo tengo!', 'CÓNDOR-1: en el aire.', 'Central: nivel 4. Todas las unidades.'];

  dustBehind(G, hero, 3);
  dustBehind(G, b5, 3);
  dustBehind(G, b9, 3);
  dustBehind(G, sierra, 2);
  // A kiss of sparks where SIERRA-2 already traded paint with the hero.
  const q = { x: 4331.1, y: 655.9 };
  for (let i = 0; i < 6; i += 1) {
    G.particles.push({
      x: q.x + G.rng.range(-8, 8), y: q.y + G.rng.range(-6, 6),
      vx: G.rng.range(-70, 70), vy: G.rng.range(-70, 70),
      life: G.rng.range(0.02, 0.12), maxLife: 0.4, size: G.rng.range(0.8, 1.6),
      colour: '#ffd98a', kind: 'spark',
    });
  }
  G.camera.x = 4304.7;
  G.camera.y = 647.2;
  G.camera.zoom = 7.0;
  G.camera.shake = 0;
  G.time = 3.7;
}

/** 2 — the proof of action: an airboat ambush at the Puerto Barro mooring. */
function stageAction(G) {
  baseScene(G);
  G.dayHour = 18.9;
  G.missions.next = 4;
  G.missions.done = G.missions.done.map((_, i) => i < 4);
  G.stats.missionsDone = 4;
  G.player.cash = 3410;
  G.player.rep = 265;
  G.missions.startNext(G); // COBROS EN EL MUELLE: the third debtor runs by water
  if (G.missions.active?.rt) G.missions.active.rt.collected = 1;

  // Two stagings died on Puerto Barro's land: round 1 put a fighter inside a
  // stilthouse roof, round 2 squeezed the fight onto a deck sliver between two
  // roofs and the waterline. The lagoon is the village's one honest stage —
  // open water, the mooring dock for a midline, the shore behind the camera.
  // The debtors flee by fan boat; the collection happens at speed.
  const boat = G.boats[0];
  boat.x = 1420; boat.y = 3960; boat.angle = -0.5;
  boat.vx = 66; boat.vy = -31;
  boat.hull = 86;
  boat.driver = 'player';
  boat.fanSpin = 0.85;
  const p = G.player;
  p.mode = 'boat';
  p.boat = boat;
  p.x = boat.x; p.y = boat.y; p.angle = boat.angle;
  p.vx = boat.vx; p.vy = boat.vy;
  p.hp = 64;
  p.armour = 20;
  p.weapons[2].owned = true; p.weapons[2].ammo = Infinity;
  p.weapons[3].owned = true; p.weapons[3].ammo = 41;
  p.weapons[4].owned = true; p.weapons[4].ammo = 8;
  p.weaponSlot = 3;
  p.hurtT = 0.18;

  // The debtor's boat cutting across the bow, his brother standing in it,
  // firing back over the fan cage.
  const rivalBoat = G.boats[1];
  rivalBoat.x = 1560; rivalBoat.y = 3860; rivalBoat.angle = 2.4;
  rivalBoat.vx = -48; rivalBoat.vy = 26;
  rivalBoat.hull = 64;
  rivalBoat.driver = 'rival';
  rivalBoat.fanSpin = 0.7;
  const rival = makePed(1556, 3856, { hostile: true, armed: true, hp: 42, weapon: 'revolver', shirt: '#3a3f45', name: 'Hermano Ciénaga' });
  rival.state = 'fight';
  rival.angle = -2.05;
  G.peds.push(rival);
  // A third boat moored quiet in the foreground, and Toña watching from the dock.
  const moored = G.boats[3];
  moored.x = 1360; moored.y = 4020; moored.angle = 0.9;
  moored.driver = 'parked';
  const tona = makePed(1492, 4018, { name: 'Toña', shirt: '#d9c25a' });
  tona.state = 'cower';
  G.peds.push(tona);

  // Live rounds across the water, both directions, and the numbers they wrote.
  G.combat.projectiles.push(
    { x: 1462, y: 3942, vx: 1180, vy: -980, damage: 26, from: 'player', owner: p, life: 0.3, trail: [] },
    { x: 1458, y: 3950, vx: 1180, vy: -980, damage: 26, from: 'player', owner: p, life: 0.3, trail: [] },
    { x: 1532, y: 3882, vx: -1150, vy: 900, damage: 22, from: 'ped', owner: rival, life: 0.3, trail: [] },
  );
  G.floaters.push(
    { x: 1566, y: 3832, text: '-26', life: 0.62, maxLife: 0.8, colour: '#ffb08a', size: 16 },
    { x: 1580, y: 3846, text: '-19', life: 0.4, maxLife: 0.8, colour: '#ffb08a', size: 14 },
    { x: 1476, y: 3896, text: 'DEUDA COBRADA · +$180', life: 1.1, maxLife: 1.4, colour: '#9fe8b0', size: 16 },
  );
  // Muzzle blooms at both guns — tight, not the balloons of round 1.
  for (const [mx, my] of [[1464, 3940], [1530, 3884]]) {
    G.particles.push({
      x: mx, y: my, vx: 0, vy: 0, life: 0.02, maxLife: 0.09, size: 5,
      colour: 'rgba(255,205,110,0.95)', kind: 'flash',
    });
  }
  sprayBehind(G, boat, 10);
  sprayBehind(G, rivalBoat, 8);
  G.police.stars = 2.1;
  G.police.sight = 'INSIGHT';
  G.police.lastSeen = { x: p.x, y: p.y };
  mkCop(G, 0, 1020, 3552, 0.7, 130); // BRAVO-5 en route, still west of the village
  G.police.log = ['Central: disparos en Puerto Barro.', 'BRAVO-5 (PURSUIT): en ruta.'];

  G.camera.x = 1470;
  G.camera.y = 3930;
  G.camera.zoom = 3.2;
  G.time = 5.1;
}

/** 3 — the chart: full map, GPS thread to the Faro, the season's ledger down the side. */
function stageMap(G) {
  baseScene(G);
  G.missions.next = 10;
  G.missions.done = G.missions.done.map((_, i) => i < 10);
  G.stats.missionsDone = 10;
  G.stats.jugs = 9;
  G.stats.exports = 4;
  G.exports = G.exports.map((_, i) => i < 4);
  G.player.cash = 12480;
  G.player.rep = 640;
  G.missions.startNext(G); // marker: the Faro at Punta Faros
  const p = G.player;
  const car = makeCar(CAR_MODELS[0], 5150, 1080, 1.57, '#c8432b');
  car.driver = 'player';
  G.cars.push(car);
  p.mode = 'car';
  p.car = car;
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  p.hp = 88;
  p.weapons[3].owned = true; p.weapons[3].ammo = 84;
  p.weapons[4].owned = true; p.weapons[4].ammo = 12;
  p.weapons[5].owned = true; p.weapons[5].ammo = 150;
  p.weapons[6].owned = true; p.weapons[6].ammo = 20;
  G.police.stars = 4.2;
  G.police.sight = 'SEARCHING';
  mkCop(G, 0, 4700, 640, 0, 0);
  mkCop(G, 1, 2900, 2400, 0, 0);
  G.camera.x = p.x;
  G.camera.y = p.y;
  G.camera.zoom = 1.02;
  G.screen = 'map';
  G.time = 2.2;
}

/** 4 — the receipt: MISSION PASSED over the fan boat at Isla Tormenta's dock. */
function stagePassed(G) {
  baseScene(G);
  G.dayHour = 17.85;
  G.missions.next = 5;
  G.missions.done = G.missions.done.map((_, i) => i < 5);
  G.stats.missionsDone = 5;
  G.player.cash = 4510;
  G.player.rep = 330;
  // Deliberately NO startNext: AGUA DE NOCHE just finished, and between jobs
  // the mission marker rests on Mamá Yara's porch across the basin — so no
  // objective ring intrudes on the receipt (round 1's ring swallowed the dock),
  // while the panel still shows JOB 6/15 and where the season goes next.

  // Afloat this time, just off the west shore (water ends, sand begins, around
  // x 3640 at this latitude): the fan still turning, spray settling, the crew
  // waiting on the sand with the island's rum.
  const boat = G.boats.find((b) => dist(b.x, b.y, 3520, 3000) < 200) ?? G.boats[2];
  boat.x = 3590; boat.y = 3130; boat.angle = 2.86;
  boat.vx = -52; boat.vy = 9;
  boat.hull = 92;
  boat.driver = 'player';
  boat.fanSpin = 0.75;
  const p = G.player;
  p.mode = 'boat';
  p.boat = boat;
  p.x = boat.x; p.y = boat.y; p.angle = boat.angle;
  p.vx = boat.vx; p.vy = boat.vy;
  p.hp = 91;
  p.weapons[3].owned = true; p.weapons[3].ammo = 52;
  p.weapons[4].owned = true; p.weapons[4].ammo = 6;

  const nando = makePed(3690, 3122, { name: 'Nando Quintana', shirt: '#2e6f6a', armed: true, wanderR: 10 });
  const lupe = makePed(3752, 3176, { name: 'Lupe Ferrer', shirt: '#d9a521', armed: true, wanderR: 10 });
  nando.angle = 0.4;
  lupe.angle = -0.5;
  G.peds.push(nando, lupe);
  sprayBehind(G, boat, 10);
  G.floaters.push(
    { x: 3640, y: 3190, text: '+$1,100', life: 1.2, maxLife: 1.4, colour: '#9fe8b0', size: 19 },
    { x: 3740, y: 3200, text: '+80 REP', life: 1.05, maxLife: 1.4, colour: '#e8a33d', size: 16 },
  );
  // t/dur must sit inside the banner's fade envelope (alpha 1 between 0.12 and
  // 0.82 of the duration): round 1's t 1.4 / dur 999 rendered the banner at
  // alpha 0.01 — a receipt nobody could see.
  G.banner = { title: 'MISSION PASSED', line: 'AGUA DE NOCHE · +$1,100 · +80 REP', t: 1.0, dur: 4.0 };
  G.camera.x = 3660;
  G.camera.y = 3110;
  G.camera.zoom = 3.6;
  G.time = 4.3;
}

export function stageShot(G, name) {
  switch (name) {
    case 'chase':
      stageChase(G);
      break;
    case 'action':
      stageAction(G);
      break;
    case 'map':
      stageMap(G);
      break;
    case 'passed':
      stagePassed(G);
      break;
    default:
      stageChase(G);
  }
  // The staged frame is a held breath: no prompt, no pause, the banner where it belongs.
  G.prompt = null;
}
