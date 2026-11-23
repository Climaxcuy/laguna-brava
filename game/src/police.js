// La Patrulla Estatal: the basin's law. Heat is a float from 0 to 5; crimes push it up,
// hiding lets it bleed away. Each star the player carries buys dispatch units with names
// and jobs — pursuers, a rammer, a roadblock that parks across the road ahead, a spotter
// who will not close but will not lose you either — and at four stars CÓNDOR-1 lifts off
// and its spotlight becomes a sixth pair of eyes. The HUD's dispatch panel is fed from
// this module's unit list, live distances and all.

import { CAR_MODELS, DISPATCH_UNITS } from './config.js';
import { clamp, dist } from './rng.js';
import { ROAD_PATHS, driveToward, makeCar, pointAlong } from './vehicles.js';

export function createPolice() {
  return {
    stars: 0,
    sight: 'CALM',           // CALM | SEARCHING | INSIGHT
    lastSeen: { x: 0, y: 0 },
    unseenT: 0,
    units: [],               // { car, callsign, role, mode }
    heli: null,
    log: [],                 // dispatch chatter lines, newest last
    reportCrime,
    addHeat,
    update,
    onCopWrecked,
    desiredUnits,
    clearAll,
  };
}

function say(G, line) {
  const log = G.police.log;
  log.push(line);
  if (log.length > 4) log.shift();
}

export function reportCrime(kind, x, y) {
  // Bound through G at call time: see wirePolice in main.js, which replaces this stub.
  void kind; void x; void y;
}

function addHeat(G, amount) {
  const pol = G.police;
  pol.stars = clamp(pol.stars + amount, 0, 5);
}

function desiredUnits(stars) {
  if (stars < 0.5) return 0;
  return Math.min(5, Math.floor(stars + 0.5));
}

/** Line of sight between two points, blocked only by buildings (the swamp is honest). */
export function lineOfSight(G, x1, y1, x2, y2) {
  const steps = 7;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (G.world.blockedAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 3)) return false;
  }
  return true;
}

function spawnPointNear(G, minD, maxD) {
  const p = G.player;
  for (let tries = 0; tries < 14; tries += 1) {
    const path = G.rng.pick(ROAD_PATHS);
    const s = G.rng.range(60, path.total - 60);
    const pos = pointAlong(path, s, 0);
    const d = dist(pos.x, pos.y, p.x, p.y);
    if (d >= minD && d <= maxD) return pos;
  }
  const path = G.rng.pick(ROAD_PATHS);
  return pointAlong(path, G.rng.range(60, path.total - 60), 0);
}

function spawnUnit(G, spec) {
  const pol = G.police;
  const pos = spawnPointNear(G, 780, 1150);
  const car = makeCar(CAR_MODELS[2], pos.x, pos.y, pos.angle, '#e9e6dd');
  car.driver = 'cop';
  car.name = 'Patrulla ' + spec.callsign;
  car.police = true;
  G.cars.push(car);
  const unit = { car, callsign: spec.callsign, role: spec.role, mode: 'hunt', blockPoint: null };
  pol.units.push(unit);
  say(G, `${spec.callsign} (${spec.role}): en ruta.`);
  return unit;
}

function onCopWrecked(car, byPlayer) {
  void car; void byPlayer;
}

function clearAll(G) {
  const pol = G.police;
  for (const unit of pol.units) {
    unit.car.driver = 'parked';
    unit.car.police = false;
  }
  pol.units = [];
  pol.heli = null;
  pol.stars = 0;
  pol.sight = 'CALM';
}

export function wirePolice(G) {
  const pol = G.police;
  pol.reportCrime = (kind, x, y) => {
    const before = Math.floor(pol.stars + 0.5);
    if (kind === 'shot') addHeat(G, pol.stars < 1 ? 1 : 0.34);
    else if (kind === 'kill') addHeat(G, 1.6);
    else if (kind === 'theft') addHeat(G, 1);
    else if (kind === 'assault') addHeat(G, 0.5);
    else if (kind === 'crash') addHeat(G, 0.3);
    else if (kind === 'seen') addHeat(G, pol.stars < 1 ? 1 : 0.15);
    else if (kind === 'speed') addHeat(G, 0.2);
    pol.lastSeen = { x, y };
    if (pol.sight === 'CALM' && pol.stars > 0) pol.sight = 'SEARCHING';
    const after = Math.floor(pol.stars + 0.5);
    if (after > before) say(G, `Central: nivel ${after}. Todas las unidades.`);
  };
  pol.onCopWrecked = (car, byPlayer) => {
    const idx = pol.units.findIndex((u) => u.car === car);
    if (idx >= 0) {
      say(G, `${pol.units[idx].callsign}: ¡unidad caída!`);
      pol.units.splice(idx, 1);
    }
    if (byPlayer) addHeat(G, 0.8);
  };
  return pol;
}

function updateHeli(G, dt) {
  const pol = G.police;
  const p = G.player;
  if (pol.stars >= 3.5) {
    if (!pol.heli) {
      pol.heli = { x: p.x + 700, y: p.y - 700, angle: 0, rotor: 0, spot: 0 };
      say(G, 'CÓNDOR-1: en el aire.');
    }
    const h = pol.heli;
    // The helicopter hangs off the player's shoulder, patient as weather.
    const tx = p.x + Math.cos(G.time * 0.24) * 210;
    const ty = p.y + Math.sin(G.time * 0.24) * 210 - 60;
    h.x += (tx - h.x) * Math.min(1, dt * 1.4);
    h.y += (ty - h.y) * Math.min(1, dt * 1.4);
    h.angle = Math.atan2(p.y - h.y, p.x - h.x);
    h.rotor += dt * 34;
    const d = dist(h.x, h.y, p.x, p.y);
    h.spot = d < 430 ? 1 : 0;
  } else if (pol.heli) {
    pol.heli.x += Math.cos(pol.heli.angle) * 300 * dt;
    pol.heli.y += Math.sin(pol.heli.angle) * 300 * dt;
    if (dist(pol.heli.x, pol.heli.y, p.x, p.y) > 1500) pol.heli = null;
  }
}

export function update(G, dt) {
  const pol = G.police;
  const p = G.player;
  if (p.dead) return;

  // Sight: any unit (or the helicopter) with eyes on the player refreshes the hunt.
  let seen = false;
  for (const unit of pol.units) {
    const d = dist(unit.car.x, unit.car.y, p.x, p.y);
    if (d < 460 && lineOfSight(G, unit.car.x, unit.car.y, p.x, p.y)) seen = true;
  }
  if (pol.heli && pol.heli.spot && dist(pol.heli.x, pol.heli.y, p.x, p.y) < 430) seen = true;
  if (seen) {
    pol.sight = 'INSIGHT';
    pol.unseenT = 0;
    pol.lastSeen = { x: p.x, y: p.y };
  } else if (pol.stars > 0) {
    pol.unseenT += dt;
    pol.sight = pol.unseenT > 2.5 ? 'SEARCHING' : 'INSIGHT';
    // Hidden long enough, the net loosens one notch at a time.
    if (pol.unseenT > 11) {
      pol.unseenT = 5;
      pol.stars = Math.max(0, pol.stars - 1);
      if (pol.stars === 0) {
        say(G, 'Central: se perdió el rastro.');
        pol.sight = 'CALM';
      } else {
        say(G, 'Central: bajen el nivel, sigan buscando.');
      }
    }
  }

  // Staffing: the net keeps the size the stars buy, no more, no less.
  const want = desiredUnits(pol.stars);
  const usedSpecs = new Set(pol.units.map((u) => u.callsign));
  if (pol.units.length < want) {
    const spec = DISPATCH_UNITS.find((s) => !usedSpecs.has(s.callsign));
    if (spec && G.rng.chance(0.06)) spawnUnit(G, spec);
  }
  if (pol.units.length > want && pol.sight !== 'INSIGHT') {
    const unit = pol.units.pop();
    unit.car.driver = 'traffic';
    unit.car.police = false;
    unit.car.route = null;
  }

  updateHeli(G, dt);

  // Driving the net.
  for (const unit of pol.units) {
    const car = unit.car;
    if (car.wrecked || car.sunk) continue;
    const d = dist(car.x, car.y, p.x, p.y);
    if (unit.role === 'ROADBLOCK') {
      if (!unit.blockPoint || unit.mode === 'hunt') {
        // Get ahead of the quarry and park across their road.
        const ahead = 460;
        unit.blockPoint = {
          x: p.x + Math.cos(p.angle) * ahead,
          y: p.y + Math.sin(p.angle) * ahead,
        };
        unit.mode = 'position';
      }
      if (unit.mode === 'position') {
        const bd = driveToward(G, car, unit.blockPoint.x, unit.blockPoint.y, dt, 1, 60);
        if (bd < 60) unit.mode = 'set';
      } else if (unit.mode === 'set') {
        // Sit sideways, lights rolling, until the quarry slips past — then join the chase.
        const wantAngle = p.angle + Math.PI / 2;
        car.angle += clamp(((wantAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -dt, dt);
        car.speed = 0;
        if (d < 150 || (pol.lastSeen && dist(p.x, p.y, unit.blockPoint.x, unit.blockPoint.y) > 620)) {
          unit.mode = 'hunt';
          unit.role = 'PURSUIT';
        }
      } else {
        driveToward(G, car, pol.lastSeen.x, pol.lastSeen.y, dt, 0.95);
      }
    } else if (unit.role === 'SPOTTER') {
      // LIMA-3 will not close. LIMA-3 will not lose you either.
      const ring = 275;
      const tx = p.x + Math.cos(Math.atan2(car.y - p.y, car.x - p.x)) * ring;
      const ty = p.y + Math.sin(Math.atan2(car.y - p.y, car.x - p.x)) * ring;
      if (d > ring + 60) driveToward(G, car, p.x, p.y, dt, 0.9);
      else if (d < ring - 60) driveToward(G, car, tx, ty, dt, 0.5);
      else driveToward(G, car, tx, ty, dt, 0.35);
    } else if (unit.role === 'RAMMER') {
      // SIERRA-2 aims at the quarry's door, not their bumper.
      const side = (p.angle ?? 0) + Math.PI / 2;
      const tx = p.x + Math.cos(side) * 30 + Math.cos(p.angle) * 40;
      const ty = p.y + Math.sin(side) * 30 + Math.sin(p.angle) * 40;
      driveToward(G, car, tx, ty, dt, 1.12);
    } else {
      // PURSUIT: lead the target a little, press, and do not let go.
      const leadT = clamp(d / 700, 0, 0.55);
      const tx = (pol.sight === 'INSIGHT' ? p.x : pol.lastSeen.x) + (p.vx ?? 0) * leadT;
      const ty = (pol.sight === 'INSIGHT' ? p.y : pol.lastSeen.y) + (p.vy ?? 0) * leadT;
      driveToward(G, car, tx, ty, dt, 1.02);
    }
  }
  G.audio.siren(pol.sight === 'INSIGHT' && pol.units.length > 0);
}
