// Laguna Brava's conductor. This module owns the one game state object every other module
// reads, the fixed-step loop, the screen state machine (title, play, map, pause, shop,
// over), and the player's own body: walking the boardwalks, driving what can be driven,
// floating what can be floated, and pressing E at the right doorstep. Everything else —
// the law, the jobs, the money — lives in its own module and is only ever called from here
// or from the systems it composes.

import { DAY_LENGTH, DAY_START, STEP, VIEW_H, VIEW_W, WEAPONS } from './config.js';
import { createRng, clamp, dist, seedFromString } from './rng.js';
import { createInput, ACTIONS } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createVehicles, updateTraffic, driveCar, carNear } from './vehicles.js';
import { createAirboats, stepAirboat, boatNear, boatSpeed } from './airboat.js';
import { createPeds, updatePeds } from './peds.js';
import { createPolice, wirePolice, update as updatePolice } from './police.js';
import { createCombat, selectWeapon } from './combat.js';
import { createMissions } from './missions.js';
import { createEconomy } from './economy.js';
import { createRenderer } from './render.js';
import { drawHud } from './hud.js';
import { drawFullMap } from './minimap.js';
import { drawTitle, drawPause, drawShop, drawGameOver } from './menus.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const SEED = Number.isInteger(seedParam) ? seedParam : 20261123;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function freshWeapons() {
  const weapons = {};
  for (const w of WEAPONS) {
    weapons[w.slot] = { owned: w.slot === 1, ammo: w.ammo };
  }
  return weapons;
}

function createGame() {
  const world = createWorld();
  const G = {
    time: 0,
    playSeconds: 0,
    dayHour: DAY_START,
    night: false,
    forcedNight: false,
    screen: 'title',
    menuIndex: 0,
    shopOpen: null,
    shopLine: '',
    banner: null,
    prompt: null,
    aim: { x: 0, y: 0 },
    weather: { storm: 0, stormTarget: 0 },
    camera: { x: 1050, y: 3750, zoom: 1.25, shake: 0 },
    rng: createRng(seedFromString('laguna-brava-play') + SEED),
    world,
    audio: createAudio(),
    input: null,
    renderer: null,
    player: {
      x: 806, y: 3966, angle: -0.4, vx: 0, vy: 0,
      mode: 'foot', car: null, boat: null,
      hp: 100, armour: 0, cash: 250, rep: 0,
      weapons: freshWeapons(), weaponSlot: 1,
      fireT: 0, hurtT: 0, godT: 0, dead: false, firing: false, moving: false,
    },
    cars: [],
    traffic: [],
    boats: [],
    peds: [],
    pickups: [],
    particles: [],
    floaters: [],
    exports: new Array(10).fill(false),
    stats: { missionsDone: 0, jugs: 0, exports: 0, rivalsDown: 0, carsStolen: 0, boatMeters: 0, carMeters: 0 },
    onPlayerDown: null,
  };
  const vehicles = createVehicles(world);
  G.cars = vehicles.cars;
  G.traffic = vehicles.traffic;
  G.boats = createAirboats(world);
  G.police = createPolice();
  wirePolice(G);
  G.combat = createCombat();
  G.missions = createMissions();
  G.economy = createEconomy();
  G.peds = createPeds(G);
  for (const jug of world.jugs) {
    G.pickups.push({ kind: 'jug', x: jug.x, y: jug.y, jugId: jug.id, bobPhase: jug.id * 1.3 });
  }
  G.onPlayerDown = () => {
    setTimeout(() => {
      if (G.player.dead) G.screen = 'over';
    }, 900);
  };
  return G;
}

/** Wipe the season back to its first morning (Nueva Temporada). */
function resetProgress(G) {
  const p = G.player;
  p.x = 806; p.y = 3966; p.mode = 'foot'; p.car = null; p.boat = null;
  p.hp = 100; p.armour = 0; p.cash = 250; p.rep = 0; p.dead = false;
  p.weapons = freshWeapons();
  p.weaponSlot = 1;
  G.missions.next = 0;
  G.missions.done = G.missions.done.map(() => false);
  G.missions.active = null;
  G.exports = new Array(10).fill(false);
  G.stats = { missionsDone: 0, jugs: 0, exports: 0, rivalsDown: 0, carsStolen: 0, boatMeters: 0, carMeters: 0 };
  for (const jug of G.world.jugs) jug.taken = false;
  G.pickups = G.pickups.filter((pk) => pk.kind === 'jug');
  for (const jug of G.world.jugs) {
    if (!G.pickups.some((pk) => pk.kind === 'jug' && pk.jugId === jug.id)) {
      G.pickups.push({ kind: 'jug', x: jug.x, y: jug.y, jugId: jug.id, bobPhase: jug.id * 1.3 });
    }
  }
  G.police.clearAll(G);
  G.playSeconds = 0;
}

// ------------------------------------------------------------ player body

function updatePlayerFoot(G, dt) {
  const p = G.player;
  const input = G.input;
  const mv = input.moveVector();
  const surface = G.world.terrainAt(p.x, p.y);
  const grip = [0, 0.25, 0.45, 0.9, 0.75, 1, 1, 1, 1][surface] ?? 1;
  const speed = (input.running() ? 208 : 124) * (grip === 0 ? 0 : grip);
  p.moving = (mv.x !== 0 || mv.y !== 0) && grip > 0;
  if (p.moving) {
    const nx = p.x + mv.x * speed * dt;
    const ny = p.y + mv.y * speed * dt;
    // Deep water is a wall to a walker; the shallows are only a brake (in the grip).
    const deepAt = (x, y) => G.world.terrainAt(x, y) === 0;
    if (!G.world.blockedAt(nx, p.y, 8) && !deepAt(nx, p.y)) p.x = nx;
    if (!G.world.blockedAt(p.x, ny, 8) && !deepAt(p.x, ny)) p.y = ny;
    if (!input.firing()) p.angle = Math.atan2(mv.y, mv.x);
    p.vx = mv.x * speed;
    p.vy = mv.y * speed;
  } else {
    p.vx = 0;
    p.vy = 0;
  }
  if (input.firing()) {
    p.angle = Math.atan2(G.aim.y - p.y, G.aim.x - p.x);
    G.combat.playerShoot(G);
  }
  p.firing = false;
}

function updatePlayerVehicle(G, dt) {
  const p = G.player;
  const input = G.input;
  if (p.mode === 'car' && p.car) {
    driveCar(G, p.car, input.throttle(), input.steer(), dt);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.vx = Math.cos(p.car.angle) * p.car.speed;
    p.vy = Math.sin(p.car.angle) * p.car.speed;
    G.stats.carMeters += Math.abs(p.car.speed) * dt;
    G.audio.vehicleLoop('car', Math.abs(input.throttle()), Math.abs(p.car.speed) / p.car.model.top);
    if (p.car.sunk) exitVehicle(G);
  } else if (p.mode === 'boat' && p.boat) {
    stepAirboat(G, p.boat, input.throttle(), input.steer(), dt);
    p.x = p.boat.x;
    p.y = p.boat.y;
    p.angle = p.boat.angle;
    p.vx = p.boat.vx;
    p.vy = p.boat.vy;
    G.stats.boatMeters += boatSpeed(p.boat) * dt;
    G.audio.vehicleLoop('boat', Math.abs(input.throttle()), boatSpeed(p.boat) / 280);
  }
}

function exitVehicle(G) {
  const p = G.player;
  const v = p.car ?? p.boat;
  if (v) {
    // Step out to the left side, onto whatever is there, if it can hold a person.
    for (const a of [v.angle + Math.PI / 2, v.angle - Math.PI / 2, v.angle + Math.PI]) {
      const nx = v.x + Math.cos(a) * 34;
      const ny = v.y + Math.sin(a) * 34;
      if (!G.world.blockedAt(nx, ny, 8) && G.world.terrainAt(nx, ny) !== 0) {
        p.x = nx;
        p.y = ny;
        break;
      }
    }
    if (p.car) p.car.driver = p.car.driver === 'player' ? 'parked' : p.car.driver;
    if (p.boat) { p.boat.driver = null; p.boat.moored = true; }
  }
  p.mode = 'foot';
  p.car = null;
  p.boat = null;
  G.audio.door();
  G.audio.vehicleLoop(null, 0, 0);
}

function enterCar(G, car) {
  const p = G.player;
  const wasTraffic = car.driver === 'traffic';
  car.driver = 'player';
  car.route = null;
  car.doorsOpen = 0.5;
  p.mode = 'car';
  p.car = car;
  p.x = car.x;
  p.y = car.y;
  G.audio.door();
  if (wasTraffic || car.exportId >= 0) {
    G.stats.carsStolen += 1;
    G.police.reportCrime('theft', car.x, car.y);
  }
}

function enterBoat(G, boat) {
  const p = G.player;
  boat.driver = 'player';
  boat.moored = false;
  p.mode = 'boat';
  p.boat = boat;
  p.x = boat.x;
  p.y = boat.y;
  G.audio.door();
  G.audio.splash();
}

/** The E key's whole world: missions, shops, doors, hulls — in that order of importance. */
function computePrompt(G) {
  const p = G.player;
  if (p.mode !== 'foot') return 'E — Bajar';
  if (!G.missions.active && G.missions.next < 15) {
    const giver = { x: 760, y: 3906 };
    if (dist(p.x, p.y, giver.x, giver.y) < 85) {
      const m = G.missions.hudData(G);
      return `E — Hablar: ${m.stage} (JOB ${G.missions.next + 1}/15)`;
    }
  }
  const shop = G.world.shopNear(p.x, p.y, 78);
  if (shop) return `E — ${shop.name}`;
  const boat = boatNear(G, p.x, p.y, 62);
  if (boat) return 'E — Subir a la lancha';
  const car = carNear(G, p.x, p.y, 58);
  if (car) return `E — Tomar el ${car.name}`;
  return null;
}

function interact(G) {
  const p = G.player;
  if (p.mode !== 'foot') {
    exitVehicle(G);
    return;
  }
  if (!G.missions.active && G.missions.next < 15) {
    if (dist(p.x, p.y, 760, 3906) < 85) {
      G.missions.startNext(G);
      return;
    }
  }
  const shop = G.world.shopNear(p.x, p.y, 78);
  if (shop) {
    const line = G.economy.shopUse(G, shop);
    if (line && !G.shopOpen) G.banner = { title: shop.name.toUpperCase(), line, t: 0, dur: 2.6 };
    if (G.shopOpen) G.shopLine = line ?? '';
    return;
  }
  const boat = boatNear(G, p.x, p.y, 62);
  if (boat) { enterBoat(G, boat); return; }
  const car = carNear(G, p.x, p.y, 58);
  if (car) enterCar(G, car);
}

// ------------------------------------------------------------ the loop

function simulate(G, dt) {
  G.time += dt;
  G.playSeconds += dt;
  G.dayHour = (G.dayHour + (dt * 24) / DAY_LENGTH) % 24;
  G.night = G.forcedNight || G.dayHour >= 19.3 || G.dayHour < 5.8;
  const p = G.player;
  if (p.fireT > 0) p.fireT -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.godT > 0) p.godT -= dt;

  // Storm eases toward whatever the story demands of the sky.
  const target = G.missions.active?.mission.id === 'tormenta' ? 1 : 0;
  G.weather.storm += clamp(target - G.weather.storm, -dt * 0.1, dt * 0.1);

  if (!p.dead) {
    if (p.mode === 'foot') updatePlayerFoot(G, dt);
    else updatePlayerVehicle(G, dt);
  }
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  G.combat.update(G, dt);
  G.missions.update(G, dt);
  G.economy.updatePickups(G, dt);

  // Damaged cars smoke; sinking ones bubble; the world keeps its small promises.
  for (const car of G.cars) {
    if (car.doorsOpen > 0) car.doorsOpen -= dt;
    if (!car.wrecked && car.health < 35 && car.health > 0 && G.rng.chance(0.12)) {
      G.particles.push({
        x: car.x + G.rng.range(-8, 8), y: car.y - 8,
        vx: G.rng.range(-6, 6), vy: G.rng.range(-26, -14),
        life: 0, maxLife: G.rng.range(0.7, 1.3), size: G.rng.range(4, 8),
        colour: 'rgba(40,38,36,0.55)', kind: 'smoke',
      });
    }
  }
  // Particles and floaters live and die here, whoever spawned them.
  for (const pt of G.particles) {
    pt.life += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.kind === 'smoke' || pt.kind === 'spray') pt.vy -= 12 * dt;
  }
  G.particles = G.particles.filter((pt) => pt.life < pt.maxLife);
  for (const f of G.floaters) {
    f.life -= dt;
  }
  G.floaters = G.floaters.filter((f) => f.life > 0);
  if (G.banner) {
    G.banner.t += dt;
    if (G.banner.t >= G.banner.dur) G.banner = null;
  }
  G.prompt = G.screen === 'play' && !G.shopOpen ? computePrompt(G) : null;
  G.audio.radioTick(dt, p.mode !== 'foot');
}

function updateCamera(G, dt) {
  const cam = G.camera;
  const p = G.player;
  if (G.screen === 'title') {
    cam.x = 1150 + Math.cos(G.time * 0.045) * 330;
    cam.y = 3720 + Math.sin(G.time * 0.03) * 200;
    cam.zoom += (1.3 - cam.zoom) * Math.min(1, dt * 2);
    return;
  }
  const targetZoom = p.mode === 'car' ? 1.02 : p.mode === 'boat' ? 1.08 : 1.18;
  cam.x += (p.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (p.y - cam.y) * Math.min(1, dt * 5);
  cam.zoom += (targetZoom - cam.zoom) * Math.min(1, dt * 2.5);
  if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 26);
}

function handleKeys(G) {
  const input = G.input;
  const p = G.player;
  if (G.screen === 'title') {
    if (input.pressed('ArrowDown') || input.pressed('KeyS')) G.menuIndex = (G.menuIndex + 1) % 3;
    if (input.pressed('ArrowUp') || input.pressed('KeyW')) G.menuIndex = (G.menuIndex + 2) % 3;
    if (input.pressed(ACTIONS.confirm) || input.mouse.clicked) {
      G.audio.unlock();
      if (G.menuIndex === 0) {
        resetProgress(G);
        G.screen = 'play';
        announce('Nueva temporada. Quince trabajos para Mamá Yara.');
      } else if (G.menuIndex === 1) {
        try {
          const auto = window.localStorage.getItem('laguna-brava-save-v1:auto');
          if (auto) G.economy.applySave(G, JSON.parse(auto));
        } catch { /* no autosave yet */ }
        G.screen = 'play';
        announce('Temporada continuada.');
      } else {
        G.menuIndex = 2; // the controls card stays open until Enter on another item
      }
    }
    return;
  }
  if (G.screen === 'over') {
    if (input.pressed(ACTIONS.confirm)) {
      p.dead = false;
      p.hp = 100;
      p.cash = Math.max(0, p.cash - 200);
      p.x = 5360;
      p.y = 1280;
      p.mode = 'foot';
      p.car = null;
      p.boat = null;
      G.police.clearAll(G);
      G.screen = 'play';
      announce('Despertaste en la Clínica Santa Brasa.');
    }
    return;
  }
  if (G.shopOpen) {
    const shop = G.shopOpen;
    for (let slot = 1; slot <= 6; slot += 1) {
      if (input.pressed('Digit' + slot)) {
        if (shop.kind === 'guns') G.shopLine = G.economy.buyWeapon(G, slot);
        else if (shop.kind === 'motel' && slot <= 3) {
          G.economy.saveGame(G, slot - 1);
          G.shopLine = 'Guardado en el hueco ' + slot + '.';
        }
      }
    }
    if (input.pressed(ACTIONS.interact) || input.pressed(ACTIONS.escape) || input.pressed(ACTIONS.pause)) {
      G.shopOpen = null;
      G.shopLine = '';
    }
    return;
  }
  if (input.pressed(ACTIONS.map)) {
    G.screen = G.screen === 'map' ? 'play' : 'map';
    return;
  }
  if (input.pressed(ACTIONS.pause) || input.pressed(ACTIONS.escape)) {
    G.screen = G.screen === 'pause' ? 'play' : 'pause';
    return;
  }
  if (G.screen === 'pause') {
    for (let slot = 1; slot <= 3; slot += 1) {
      if (input.pressed('Digit' + slot)) {
        if (input.down('ShiftLeft') || input.down('ShiftRight')) {
          if (G.economy.loadGame(G, slot - 1)) announce('Temporada cargada del hueco ' + slot + '.');
        } else {
          G.economy.saveGame(G, slot - 1);
          announce('Guardado en el hueco ' + slot + '.');
        }
      }
    }
    return;
  }
  if (G.screen !== 'play') return;
  if (input.pressed(ACTIONS.interact)) interact(G);
  if (input.pressed(ACTIONS.night)) G.forcedNight = !G.forcedNight;
  if (input.pressed(ACTIONS.radio)) {
    const on = G.audio.toggleRadio();
    G.banner = { title: 'RADIO', line: on ? 'Laguna 91.3 — suena la cumbia.' : 'Radio apagada.', t: 0, dur: 1.6 };
  }
  const slot = input.weaponSlot();
  if (slot > 0 && p.mode === 'foot') selectWeapon(G, slot);
}

function frame(G, renderer) {
  // The mouse aims in world space: undo the camera.
  const cam = G.camera;
  G.aim.x = cam.x + (G.input.mouse.x - VIEW_W / 2) / cam.zoom;
  G.aim.y = cam.y + (G.input.mouse.y - VIEW_H / 2) / cam.zoom;
  renderer.draw(G);
  const ctx = renderer.ctx;
  if (G.screen === 'play') drawHud(G, ctx, renderer);
  else if (G.screen === 'map') {
    drawHud(G, ctx, renderer);
    drawFullMap(G, ctx, renderer);
  } else if (G.screen === 'pause') {
    drawHud(G, ctx, renderer);
    drawPause(G, ctx);
  } else if (G.screen === 'title') {
    drawTitle(G, ctx);
  } else if (G.screen === 'over') {
    drawGameOver(G, ctx);
  }
  if (G.shopOpen) drawShop(G, ctx);
}

/**
 * The ?smoke=1 self-test: scripted hands on the real controls, walking Rayo through the
 * whole season's systems in one tight loop — take job 1 from Mamá Yara, fetch the rum,
 * deliver it, drive, float, shoot, draw five stars of Patrulla, use the Armería, save and
 * load. Any exception fails the page loudly (window.__errors); success writes its summary
 * to document.title and window.__smoke, then raises __shotReady for the capture tool.
 */
function runSmoke(G, renderer) {
  const virtual = {
    held: new Set(), pressedSet: new Set(),
    move: { x: 0, y: 0 }, throttle: 0, steer: 0, run: false, firing: false, slot: 0,
  };
  G.input.setVirtual(virtual);
  G.screen = 'play';
  const p = G.player;
  const log = [];
  let steps = 0;

  function step(n = 1) {
    for (let i = 0; i < n; i += 1) {
      handleKeys(G);
      simulate(G, STEP);
      G.input.endFrame();
      steps += 1;
    }
  }
  function press(code) {
    virtual.pressedSet.add(code);
    step(1);
  }
  function walkTo(x, y, maxSteps = 3000) {
    let guard = 0;
    while (dist(p.x, p.y, x, y) > 14 && guard < maxSteps) {
      const dx = x - p.x;
      const dy = y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      virtual.move = { x: dx / len, y: dy / len };
      virtual.run = true;
      step(1);
      guard += 1;
    }
    virtual.move = { x: 0, y: 0 };
    virtual.run = false;
    return dist(p.x, p.y, x, y) <= 20;
  }

  // 1 — Take the first job from Mamá Yara's porch.
  walkTo(772, 3948);
  press(ACTIONS.interact);
  log.push('job1 active=' + Boolean(G.missions.active));
  // 2 — The still: walk into the ring, gather the four crates where they stand.
  p.x = 1400; p.y = 2120;
  walkTo(1400, 2035);
  for (const [cx, cy] of [[1330, 2010], [1420, 2050], [1380, 1960], [1470, 2000]]) {
    p.x = cx + 30; p.y = cy + 30;
    walkTo(cx, cy, 300);
  }
  log.push('crates=' + (G.missions.active?.rt.collected ?? -1));
  // 3 — Deliver at the Astillero dock: job 1 passes.
  p.x = 1200; p.y = 3960;
  walkTo(1200, 4035);
  log.push('missionsDone=' + G.stats.missionsDone);
  // 4 — Wheels: take the parked pickup, drive the village, get out.
  walkTo(836, 3666);
  press(ACTIONS.interact);
  log.push('inCar=' + (p.mode === 'car'));
  virtual.throttle = 1;
  for (let i = 0; i < 300; i += 1) {
    virtual.steer = Math.sin(i / 40) * 0.6;
    step(1);
  }
  virtual.throttle = 0;
  virtual.steer = 0;
  press(ACTIONS.interact);
  log.push('outCar=' + (p.mode === 'foot'));
  // 5 — Water: board the fan boat at the Barro mooring and run the cut.
  p.x = 1440; p.y = 3940;
  walkTo(1492, 3972);
  press(ACTIONS.interact);
  log.push('inBoat=' + (p.mode === 'boat'));
  virtual.throttle = 1;
  for (let i = 0; i < 330; i += 1) {
    virtual.steer = Math.sin(i / 55) * 0.5;
    step(1);
  }
  virtual.throttle = 0;
  virtual.steer = 0;
  press(ACTIONS.interact);
  // 6 — Lead: buy the revolver at the Armería, then make some noise.
  p.cash += 2000;
  p.x = 1202; p.y = 3552;
  press(ACTIONS.interact);
  log.push('shopOpen=' + Boolean(G.shopOpen));
  press('Digit3');
  log.push('revolver=' + Boolean(p.weapons[3].owned));
  press(ACTIONS.escape);
  virtual.slot = 3;
  step(1);
  virtual.firing = true;
  step(90);
  virtual.firing = false;
  log.push('projectiles flew, stars=' + G.police.stars.toFixed(1));
  // 7 — The full net: five stars for five seconds of simulation.
  G.police.stars = 5;
  step(300);
  log.push('units=' + G.police.units.length + ' heli=' + Boolean(G.police.heli));
  // 8 — Paperwork: save, wipe, load.
  G.economy.saveGame(G, 0);
  const cashBefore = p.cash;
  p.cash = 1;
  G.economy.loadGame(G, 0);
  log.push('saveLoad=' + (p.cash === cashBefore));
  // 9 — Screens: map and pause render without complaint.
  G.screen = 'map';
  frame(G, renderer);
  G.screen = 'pause';
  frame(G, renderer);
  G.screen = 'play';
  frame(G, renderer);

  const summary = 'SMOKE OK steps=' + steps + ' ' + log.join(' ');
  document.title = summary;
  window.__smoke = summary;
  window.__shotReady = true;
  announce(summary);
}

async function boot() {
  const G = createGame();
  G.input = createInput(canvas);
  G.renderer = createRenderer(canvas);
  G.renderer.buildChunks(G.world);
  const renderer = G.renderer;

  if (shotName) {
    const { stageShot } = await import('./shots.js');
    try {
      stageShot(G, shotName);
    } catch (err) {
      window.__errors = String(err?.stack ?? err);
      throw err;
    }
    let painted = 0;
    const paint = () => {
      renderer.draw(G);
      const ctx = renderer.ctx;
      if (G.screen === 'play') drawHud(G, ctx, renderer);
      if (G.screen === 'map') drawFullMap(G, ctx, renderer);
      painted += 1;
      if (painted < 3) requestAnimationFrame(paint);
      else window.__shotReady = true;
    };
    requestAnimationFrame(paint);
    return;
  }

  if (params.get('smoke')) {
    runSmoke(G, renderer);
    return;
  }

  let last = performance.now();
  let accumulator = 0;
  const MAX_FRAME = 0.25;
  function loop(now) {
    requestAnimationFrame(loop);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleKeys(G);
    if (G.screen === 'play' || G.screen === 'map') {
      while (accumulator >= STEP) {
        simulate(G, STEP);
        accumulator -= STEP;
      }
    } else if (G.screen === 'title') {
      // The title's world breathes at half attention: traffic rolls, nobody dies.
      while (accumulator >= STEP) {
        G.time += STEP;
        updateTraffic(G, STEP);
        updatePeds(G, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    updateCamera(G, 1 / 60);
    frame(G, renderer);
    G.input.endFrame();
  }
  announce('Laguna Brava. Una temporada de tormentas.');
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  window.__errors = String(err?.stack ?? err);
  throw err;
});
