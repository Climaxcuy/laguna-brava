// Wheels of the basin: traffic that minds its own business on the paved roads, parked cars
// waiting to be borrowed forever, and the driving model the player and the Patrulla share.
// Cars are simple rear-drive boxes — throttle, steer, grip by surface — with just enough
// slide to make the mud honest. A car that noses into deep water is done: it sinks, and
// whoever was driving gets out wet.

import { CAR_MODELS, SURFACE, T_DEEP, T_ROAD } from './config.js';
import { ROADS } from './world.js';
import { angleDelta, clamp, createRng, dist, seedFromString, turnToward } from './rng.js';

/** Pre-measured road paths: points, cumulative lengths, total length, per road. */
export const ROAD_PATHS = ROADS.map((road) => {
  const pts = road.pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    cum.push(cum[i - 1] + dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  }
  return { road, pts, cum, total: cum[cum.length - 1] };
});

/** Point and heading at distance `s` along a path, offset `lane` units to the right of travel. */
export function pointAlong(path, s, lane = 0) {
  const { pts, cum, total } = path;
  const target = clamp(s, 0, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i += 1;
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (target - cum[i - 1]) / segLen;
  const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
  const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
  const angle = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
  return { x: x + Math.cos(angle + Math.PI / 2) * lane, y: y + Math.sin(angle + Math.PI / 2) * lane, angle };
}

let carSerial = 0;
export function makeCar(model, x, y, angle, colour) {
  carSerial += 1;
  return {
    id: carSerial,
    model, x, y, angle,
    speed: 0,
    steerVis: 0,
    colour: colour ?? model.colours[0],
    health: 100,
    driver: 'parked',       // parked | traffic | player | cop | mission
    name: model.name,
    exportId: -1,
    wrecked: false,
    sunk: false,
    doorsOpen: 0,
    honkTimer: 0,
  };
}

/** Parked cars at plazas, lots and porches — the basin's unofficial rental fleet. */
const PARK_SPOTS = [
  // [modelId, x, y, angle] — angles in radians, nose direction.
  ['brava', 5490, 1240, 0.2], ['sedan', 5560, 1360, -0.4], ['pickup', 830, 3660, 1.2],
  ['taxi', 3980, 830, 0], ['van', 2870, 560, 3.14], ['sedan', 1060, 3660, -1.1],
  ['pickup', 5230, 1010, 0.9], ['brava', 1200, 3440, 2.6], ['sedan', 5760, 3660, -0.8],
  ['truck', 3050, 700, 0], ['van', 4700, 560, 3.14], ['pickup', 4060, 830, 0.4],
  ['sedan', 2400, 700, 0], ['brava', 5610, 3520, 2.2], ['taxi', 1290, 2800, 1.57],
];

export function createVehicles(world) {
  const rng = createRng(seedFromString('laguna-brava-traffic'));
  const cars = [];
  for (const [modelId, x, y, angle] of PARK_SPOTS) {
    const model = CAR_MODELS.find((m) => m.id === modelId);
    const car = makeCar(model, x, y, angle, rng.pick(model.colours));
    cars.push(car);
  }
  // The export star: a rojo quemado Charger on the Autos Brasa lot, waiting for mission 7.
  const exportStar = makeCar(CAR_MODELS[0], 5460, 1300, -0.3, '#c8432b');
  exportStar.exportId = 0;
  exportStar.name = "Brava Charger '71 — rojo quemado";
  cars.push(exportStar);

  const traffic = [];
  const paved = ROAD_PATHS.filter((p) => p.road.kind === T_ROAD);
  for (let i = 0; i < 13; i += 1) {
    const path = paved[i % paved.length];
    const model = rng.pick(CAR_MODELS);
    const s = rng.range(0, path.total);
    const dir = rng.chance() ? 1 : -1;
    const pos = pointAlong(path, s, dir > 0 ? 26 : -26);
    const car = makeCar(model, pos.x, pos.y, dir > 0 ? pos.angle : pos.angle + Math.PI, rng.pick(model.colours));
    car.driver = 'traffic';
    car.route = { path, s, dir, cruise: rng.range(0.55, 0.8) };
    cars.push(car);
    traffic.push(car);
  }
  return { cars, traffic, rng };
}

/** The shared driving step: throttle/steer intent in, motion and damage out. */
export function driveCar(G, car, throttle, steer, dt) {
  const world = G.world;
  const surface = SURFACE[world.terrainAt(car.x, car.y)] ?? SURFACE[3];
  const model = car.model;
  if (car.wrecked || car.sunk) {
    car.speed = 0;
    return;
  }
  const grip = surface.car;
  if (grip === 0) {
    // In the water: a car floats for a breath, then it is the lagoon's.
    car.speed *= Math.max(0, 1 - 2.2 * dt);
    car.health -= 26 * dt;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.health <= 0) {
      car.sunk = true;
      car.health = 0;
      G.floaters.push({ x: car.x, y: car.y - 30, text: 'SE HUNDIÓ', life: 1.6, maxLife: 1.6, colour: '#9fd8e8', size: 17 });
    }
    return;
  }
  const topHere = model.top * (0.35 + 0.65 * grip);
  if (throttle > 0) {
    car.speed += model.accel * throttle * dt * (car.speed < 0 ? 2.2 : 1);
  } else if (throttle < 0) {
    car.speed += model.accel * 0.7 * throttle * dt * (car.speed > 0 ? 2.4 : 1);
  }
  // Rolling drag and a soft wall at the model's top speed, forward or back.
  car.speed -= car.speed * 0.55 * dt;
  car.speed = clamp(car.speed, -topHere * 0.38, topHere);
  const speedRatio = car.speed / model.top;
  const turnRate = 1.9 * clamp(speedRatio * 2.4, -1, 1) * (grip * 0.6 + 0.4);
  car.angle += steer * turnRate * dt * (car.speed < 0 ? -1 : 1);
  car.steerVis = steer;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (world.blockedAt(nx, ny, 15)) {
    const impact = Math.abs(car.speed);
    if (impact > 60) {
      car.health -= (impact - 60) * 0.16;
      G.audio.crash(Math.min(1, impact / 260));
      G.camera.shake = Math.min(14, impact * 0.05);
      spawnSparks(G, car.x, car.y, 8);
      if (car.driver === 'player') G.player.hp -= (impact - 60) * 0.03;
    }
    car.speed = -car.speed * 0.25;
    if (car.health <= 0 && !car.wrecked) {
      car.wrecked = true;
      G.floaters.push({ x: car.x, y: car.y - 34, text: 'WRECKED', life: 1.4, maxLife: 1.4, colour: '#e8a33d', size: 16 });
    }
    return;
  }
  // Car-to-car nudges: shove apart, trade a little paint and speed.
  for (const other of G.cars) {
    if (other === car || other.sunk) continue;
    const d = dist(nx, ny, other.x, other.y);
    const minD = (car.model.l + other.model.l) * 0.32;
    if (d > 0.01 && d < minD) {
      const push = (minD - d) / minD;
      const ux = (nx - other.x) / d;
      const uy = (ny - other.y) / d;
      car.x += ux * push * 26 * dt * 8;
      car.y += uy * push * 26 * dt * 8;
      const closing = Math.abs(car.speed - other.speed);
      if (closing > 70) {
        car.health -= (closing - 70) * 0.05;
        other.health -= (closing - 70) * 0.05;
        G.audio.crash(0.5);
        spawnSparks(G, (car.x + other.x) / 2, (car.y + other.y) / 2, 6);
        if (other.driver === 'traffic' && car.driver === 'player') G.police.reportCrime('crash', car.x, car.y);
      }
      car.speed *= 0.82;
      return;
    }
  }
  car.x = nx;
  car.y = ny;
  // Dust and spray behind fast wheels.
  if (Math.abs(car.speed) > 120 && G.rng.chance(0.5)) {
    const back = car.angle + Math.PI;
    G.particles.push({
      x: car.x + Math.cos(back) * 24, y: car.y + Math.sin(back) * 24,
      vx: Math.cos(back) * 30 + G.rng.range(-14, 14), vy: Math.sin(back) * 30 + G.rng.range(-14, 14),
      life: 0, maxLife: G.rng.range(0.4, 0.9), size: G.rng.range(3, 7),
      colour: surface === SURFACE[6] ? 'rgba(200,180,150,0.35)' : 'rgba(150,120,80,0.4)', kind: 'smoke',
    });
  }
}

export function spawnSparks(G, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    const a = G.rng.range(0, Math.PI * 2);
    const sp = G.rng.range(60, 240);
    G.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, maxLife: G.rng.range(0.2, 0.5), size: G.rng.range(1.5, 3),
      colour: '#ffd98a', kind: 'spark',
    });
  }
}

/** A driver brain for traffic and simple mission cars: follow the road, mind the car ahead. */
export function driveTraffic(G, car, dt) {
  const route = car.route;
  if (!route) return;
  const ahead = pointAlong(route.path, route.s + route.dir * 130, route.dir > 0 ? 26 : -26);
  let throttle = 0.7;
  // Slow for the car in front on the same road.
  for (const other of G.cars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 95) {
      const toOther = Math.atan2(other.y - car.y, other.x - car.x);
      if (Math.abs(angleDelta(car.angle, toOther)) < 0.5) throttle = d < 55 ? -0.4 : 0.1;
    }
  }
  // Slow for the player stepping into the road — mostly.
  const p = G.player;
  if (p.mode === 'foot' && dist(car.x, car.y, p.x, p.y) < 80) throttle = -0.5;
  const steer = clamp(angleDelta(car.angle, Math.atan2(ahead.y - car.y, ahead.x - car.x)) * 2.2, -1, 1);
  driveCar(G, car, throttle * route.cruise + 0.25, steer, dt);
  route.s += route.dir * car.speed * dt;
  if (route.s > route.path.total - 30) { route.s = route.path.total - 30; route.dir = -1; }
  if (route.s < 30) { route.s = 30; route.dir = 1; }
  const want = pointAlong(route.path, route.s, route.dir > 0 ? 26 : -26);
  car.routeAngle = route.dir > 0 ? want.angle : want.angle + Math.PI;
  if (car.wrecked) {
    car.driver = 'parked';
    car.route = null;
  }
}

/** Steer any car toward a world point at a chosen urgency; used by police and escorts. */
export function driveToward(G, car, tx, ty, dt, urgency = 1, arriveRadius = 0) {
  const d = dist(car.x, car.y, tx, ty);
  const toTarget = Math.atan2(ty - car.y, tx - car.x);
  const delta = angleDelta(car.angle, toTarget);
  let throttle = urgency;
  if (Math.abs(delta) > 2.2) throttle = -0.6; // badly lined up: back out and swing
  if (arriveRadius > 0 && d < arriveRadius) throttle = clamp((d / arriveRadius) - 0.15, -0.4, 0.5);
  const steer = clamp(delta * 2.4, -1, 1);
  driveCar(G, car, throttle, steer, dt);
  return d;
}

/** Keep the traffic set alive and near the action: far cars rejoin ahead of the player. */
export function updateTraffic(G, dt) {
  const p = G.player;
  for (const car of G.traffic) {
    if (car.driver !== 'traffic') continue;
    const d = dist(car.x, car.y, p.x, p.y);
    if (d > 2800) {
      const path = G.rng.pick(ROAD_PATHS.filter((pp) => pp.road.kind === T_ROAD));
      const s = clamp(path.total / 2 + G.rng.range(-600, 600), 40, path.total - 40);
      const dir = G.rng.chance() ? 1 : -1;
      const pos = pointAlong(path, s, dir > 0 ? 26 : -26);
      car.x = pos.x;
      car.y = pos.y;
      car.angle = dir > 0 ? pos.angle : pos.angle + Math.PI;
      car.speed = 0;
      car.route = { path, s, dir, cruise: G.rng.range(0.55, 0.8) };
    } else if (d < 2400) {
      driveTraffic(G, car, dt);
    }
  }
}

/** The nearest car the player could take: parked or traffic, door within reach. */
export function carNear(G, x, y, range) {
  let best = null;
  let bestD = range;
  for (const car of G.cars) {
    if (car.sunk) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
