// The fan boat: Laguna Brava's true native vehicle. An airboat does not steer like a car —
// the fan shoves air, the hull keeps whatever velocity it already had, and the rudder only
// persuades. On open water it slides wide and glorious; on mud the hull bites, grips and can
// beach; on grass it grinds itself apart. Every channel run in the story missions is this
// one physics body with a throttle and a prayer.

import { SURFACE } from './config.js';
import { clamp, dist } from './rng.js';

export function makeAirboat(x, y, angle) {
  return {
    x, y, angle,
    vx: 0, vy: 0,
    fanSpin: 0,
    hull: 100,
    driver: null,      // null | 'player' | 'rival'
    name: 'Ventilador Quintana',
    moored: true,
    sprayAcc: 0,
  };
}

export function createAirboats(world) {
  return world.moorings.map((m) => makeAirboat(m.x, m.y, m.angle));
}

/** Speed in world units per second, for the HUD and the race maths. */
export function boatSpeed(boat) {
  return Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
}

/**
 * One step of fan-boat physics. throttle -1..1 (reverse is a weak fan brake and a slower
 * push backwards), rudder -1..1. Returns the surface kind under the hull.
 */
export function stepAirboat(G, boat, throttle, rudder, dt) {
  const world = G.world;
  const kind = world.terrainAt(boat.x, boat.y);
  const grip = SURFACE[kind].boat;
  const speed = boatSpeed(boat);

  if (grip === 0) {
    // Aground on real land: the fan screams, the hull grinds, nothing moves.
    boat.vx *= Math.max(0, 1 - 6 * dt);
    boat.vy *= Math.max(0, 1 - 6 * dt);
    if (Math.abs(throttle) > 0.1 && speed < 12) boat.hull -= 3.2 * dt;
    boat.fanSpin = Math.min(1, boat.fanSpin + dt * 2) * Math.abs(throttle);
    return kind;
  }

  // The rudder only works in the fan's wash: more throttle, more authority.
  const authority = 0.35 + 0.65 * Math.min(1, Math.abs(throttle) + speed / 300);
  boat.angle += rudder * 1.55 * authority * dt * (throttle < 0 ? -1 : 1);

  // Fan thrust along the nose.
  const thrust = throttle * 265;
  boat.vx += Math.cos(boat.angle) * thrust * dt;
  boat.vy += Math.sin(boat.angle) * thrust * dt;

  // Drag: water is kind along the hull and cruel across it — that mismatch is the slide.
  const fx = Math.cos(boat.angle);
  const fy = Math.sin(boat.angle);
  const along = boat.vx * fx + boat.vy * fy;
  const acrossX = boat.vx - along * fx;
  const acrossY = boat.vy - along * fy;
  const alongDrag = kind === 2 ? 0.9 : 0.42;   // mud bites the run
  const acrossDrag = kind === 2 ? 2.6 : 1.15;  // mud also stops the slide: beached and grippy
  const na = along * Math.max(0, 1 - alongDrag * dt);
  const ncx = acrossX * Math.max(0, 1 - acrossDrag * dt);
  const ncy = acrossY * Math.max(0, 1 - acrossDrag * dt);
  boat.vx = na * fx + ncx;
  boat.vy = na * fy + ncy;

  const nx = boat.x + boat.vx * dt;
  const ny = boat.y + boat.vy * dt;
  if (world.blockedAt(nx, ny, 16)) {
    // A dock, a house, the lighthouse: the hull stops dead and pays for it.
    const impact = speed;
    if (impact > 90) {
      boat.hull -= (impact - 90) * 0.12;
      G.audio.crash(Math.min(1, impact / 300));
      G.camera.shake = Math.min(12, impact * 0.045);
      if (boat.driver === 'player') G.player.hp -= (impact - 90) * 0.02;
    }
    boat.vx *= -0.18;
    boat.vy *= -0.18;
  } else {
    boat.x = nx;
    boat.y = ny;
  }
  boat.fanSpin += (Math.abs(throttle) - boat.fanSpin) * Math.min(1, dt * 3);

  // Fan spray and wake: the white rooster-tail the screenshots love.
  boat.sprayAcc += dt * (4 + speed * 0.12);
  while (boat.sprayAcc > 1) {
    boat.sprayAcc -= 1;
    if (speed > 26) {
      const back = boat.angle + Math.PI;
      const side = G.rng.range(-1, 1);
      G.particles.push({
        x: boat.x + Math.cos(back) * 20 + Math.cos(back + Math.PI / 2) * side * 10,
        y: boat.y + Math.sin(back) * 20 + Math.sin(back + Math.PI / 2) * side * 10,
        vx: Math.cos(back) * speed * 0.32 + G.rng.range(-22, 22),
        vy: Math.sin(back) * speed * 0.32 + G.rng.range(-22, 22),
        life: 0, maxLife: G.rng.range(0.35, 0.8), size: G.rng.range(2.5, 6),
        colour: 'rgba(230,245,245,0.5)', kind: 'spray',
      });
    }
  }
  if (boat.hull < 0) boat.hull = 0;
  return kind;
}

/** The rival in the channel race: follows the channel polyline at a set pace, slides and all. */
export function stepRivalBoat(G, boat, path, dt, pace) {
  const target = path[boat.wp ?? 0];
  if (!target) return true;
  const toTarget = Math.atan2(target[1] - boat.y, target[0] - boat.x);
  let delta = toTarget - boat.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const rudder = clamp(delta * 2.2, -1, 1);
  const throttle = pace * (Math.abs(delta) > 1.2 ? 0.45 : 1);
  stepAirboat(G, boat, throttle, rudder, dt);
  if (dist(boat.x, boat.y, target[0], target[1]) < 130) boat.wp = (boat.wp ?? 0) + 1;
  return (boat.wp ?? 0) >= path.length;
}

/** The moored boat nearest a point, or null. */
export function boatNear(G, x, y, range) {
  let best = null;
  let bestD = range;
  for (const boat of G.boats) {
    const d = dist(x, y, boat.x, boat.y);
    if (d < bestD) { bestD = d; best = boat; }
  }
  return best;
}
