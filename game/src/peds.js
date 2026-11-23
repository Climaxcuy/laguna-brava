// The basin's people: porch sitters, dock hands, debtors, witnesses and the rival crew of the
// Hermanos Ciénaga who shoot back. A pedestrian is a small state machine with a home porch:
// stroll a little, stand a little, and when the shooting starts either run, cower, or — for
// the named few with guns — fight. Witnesses are the law's eyes: see a crime, count to two,
// and the Patrulla hears about it.

import { DISTRICTS } from './config.js';
import { angleDelta, clamp, dist, turnToward } from './rng.js';

const SHIRTS = ['#c8b8a2', '#7a9a8a', '#b8563e', '#4a6a8a', '#d9c25a', '#8a5a7a', '#5d7a3a', '#e0dcd2'];
const SKINS = ['#8a5a3b', '#6e452a', '#a06a42', '#59391f', '#b57e52'];
const NAMES = [
  'Toña', 'El Gordo Paz', 'Mirta', 'Sebas', 'La Flaca', 'Onésimo', 'Rut', 'El Chino',
  'Petra', 'Aldo', 'Sarita', 'El Mudo', 'Cande', 'Fito', 'La Rusa', 'Teo',
];

let pedSerial = 0;
export function makePed(x, y, opts = {}) {
  pedSerial += 1;
  return {
    id: pedSerial,
    x, y,
    angle: opts.angle ?? 0,
    speed: 0,
    hp: opts.hp ?? 30,
    state: 'stroll',
    stateT: 0,
    home: { x, y },
    wanderR: opts.wanderR ?? 190,
    shirt: opts.shirt ?? SHIRTS[pedSerial % SHIRTS.length],
    skin: SKINS[pedSerial % SKINS.length],
    name: opts.name ?? NAMES[pedSerial % NAMES.length],
    armed: opts.armed ?? false,
    weapon: opts.weapon ?? 'revolver',
    hostile: opts.hostile ?? false,
    missionRole: opts.missionRole ?? null,   // debtor | rival | villager | informant...
    fireT: 0,
    witnessT: 0,
    calledIn: false,
    down: false,
    phase: (pedSerial * 1.37) % 6.28,
  };
}

export function createPeds(G) {
  const peds = [];
  const rng = G.rng;
  // Porch crowds at every district heart: the world should never feel empty.
  for (const d of DISTRICTS) {
    const n = d.kind === 'swamp' ? 5 : d.kind === 'island' ? 4 : 8;
    for (let i = 0; i < n; i += 1) {
      let x = d.x + rng.range(-d.r * 0.55, d.r * 0.55);
      let y = d.y + rng.range(-d.r * 0.4, d.r * 0.4);
      let guard = 0;
      while ((G.world.isWater(x, y) || G.world.blockedAt(x, y, 10)) && guard < 12) {
        x = d.x + rng.range(-d.r * 0.55, d.r * 0.55);
        y = d.y + rng.range(-d.r * 0.4, d.r * 0.4);
        guard += 1;
      }
      if (G.world.isWater(x, y)) continue;
      peds.push(makePed(x, y, { wanderR: rng.range(120, 300) }));
    }
  }
  // The Quintana crew at Casa Quintana: named, armed, and on the player's side of the law.
  peds.push(makePed(790, 3920, { name: 'Mamá Yara Quintana', shirt: '#8f2318', armed: true, weapon: 'shotgun', wanderR: 60 }));
  peds.push(makePed(830, 3880, { name: 'Nando Quintana', shirt: '#2e6f6a', armed: true, wanderR: 90 }));
  peds.push(makePed(745, 3885, { name: 'Lupe Ferrer', shirt: '#d9a521', armed: true, wanderR: 90 }));
  return peds;
}

/** Someone saw something. Peds near a crime remember it; the call goes out on a delay. */
export function witnessCrime(G, x, y, kind) {
  for (const ped of G.peds) {
    if (ped.down || ped.hostile) continue;
    const d = dist(ped.x, ped.y, x, y);
    if (d < 190 && ped.witnessT <= 0) {
      ped.witnessT = kind === 'shot' ? 0.8 : 1.6;
      ped.witnessCrime = { x, y, kind };
      if (ped.state === 'stroll' || ped.state === 'porch') ped.state = 'watch';
    }
  }
}

function fleeTarget(G, ped) {
  // Run from the player, biased toward home and away from water.
  const p = G.player;
  let tx = ped.x + (ped.x - p.x) * 1.6 + (ped.home.x - ped.x) * 0.3;
  let ty = ped.y + (ped.y - p.y) * 1.6 + (ped.home.y - ped.y) * 0.3;
  if (G.world.isWater(tx, ty)) { tx = ped.home.x; ty = ped.home.y; }
  return { x: tx, y: ty };
}

function movePed(G, ped, tx, ty, dt, speed) {
  const d = dist(ped.x, ped.y, tx, ty);
  if (d < 4) { ped.speed = 0; return d; }
  const want = Math.atan2(ty - ped.y, tx - ped.x);
  ped.angle = turnToward(ped.angle, want, 6 * dt);
  const grip = G.world.terrainAt(ped.x, ped.y) === 0 ? 0 : 1;
  const step = Math.min(d, speed * grip * dt);
  const nx = ped.x + Math.cos(ped.angle) * step;
  const ny = ped.y + Math.sin(ped.angle) * step;
  if (!G.world.blockedAt(nx, ny, 7)) {
    ped.x = nx;
    ped.y = ny;
    ped.speed = speed;
  } else {
    ped.angle += 1.7 * dt;
    ped.speed = 0;
  }
  return d;
}

export function updatePeds(G, dt) {
  const p = G.player;
  const playerDanger = p.firing || (G.combat && G.combat.recentShots > 0);
  for (const ped of G.peds) {
    if (ped.down) continue;
    ped.stateT += dt;

    // The witness countdown runs in every state: see it, count, call it in.
    if (ped.witnessT > 0) {
      ped.witnessT -= dt;
      if (ped.witnessT <= 0 && !ped.calledIn) {
        ped.calledIn = true;
        G.police.reportCrime(ped.witnessCrime?.kind ?? 'seen', ped.witnessCrime?.x ?? ped.x, ped.witnessCrime?.y ?? ped.y);
        ped.state = 'flee';
        ped.stateT = 0;
      }
    }

    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    switch (ped.state) {
      case 'stroll': {
        if (ped.stateT > 3.5) {
          ped.stateT = 0;
          ped.target = {
            x: ped.home.x + G.rng.range(-ped.wanderR, ped.wanderR),
            y: ped.home.y + G.rng.range(-ped.wanderR * 0.7, ped.wanderR * 0.7),
          };
          if (G.rng.chance(0.4)) ped.state = 'porch';
        }
        if (ped.target) movePed(G, ped, ped.target.x, ped.target.y, dt, 34);
        else ped.speed = 0;
        if (playerDanger && dPlayer < 240) { ped.state = ped.armed && ped.hostile ? 'fight' : 'flee'; ped.stateT = 0; }
        break;
      }
      case 'porch': {
        ped.speed = 0;
        if (ped.stateT > 4) { ped.state = 'stroll'; ped.stateT = 0; }
        if (playerDanger && dPlayer < 240) { ped.state = ped.armed && ped.hostile ? 'fight' : 'flee'; ped.stateT = 0; }
        break;
      }
      case 'watch': {
        ped.speed = 0;
        ped.angle = turnToward(ped.angle, Math.atan2(p.y - ped.y, p.x - ped.x), 4 * dt);
        if (ped.stateT > 2.4) { ped.state = 'flee'; ped.stateT = 0; }
        break;
      }
      case 'flee': {
        const t = fleeTarget(G, ped);
        movePed(G, ped, t.x, t.y, dt, 118);
        if (ped.stateT > 5 && dPlayer > 320) { ped.state = 'stroll'; ped.stateT = 0; ped.calledIn = false; }
        break;
      }
      case 'cower': {
        ped.speed = 0;
        if (ped.stateT > 4 && dPlayer > 300) { ped.state = 'stroll'; ped.stateT = 0; }
        break;
      }
      case 'fight': {
        // Keep a firing distance, strafe a little, and shoot on the weapon's rhythm.
        const want = ped.weapon === 'shotgun' ? 170 : 260;
        const radial = dPlayer > want + 40 ? 1 : dPlayer < want - 40 ? -1 : 0;
        const tx = ped.x + Math.cos(Math.atan2(p.y - ped.y, p.x - ped.x)) * radial * 60
          + Math.cos(ped.phase + ped.stateT * 0.7) * 26;
        const ty = ped.y + Math.sin(Math.atan2(p.y - ped.y, p.x - ped.x)) * radial * 60
          + Math.sin(ped.phase + ped.stateT * 0.7) * 26;
        movePed(G, ped, tx, ty, dt, 62);
        ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
        ped.fireT -= dt;
        if (ped.fireT <= 0 && dPlayer < 480 && !p.dead) {
          ped.fireT = ped.weapon === 'smg' ? 0.32 : 0.85;
          G.combat.pedShoot(G, ped);
        }
        if (ped.hp < 10 && G.rng.chance(0.3)) { ped.state = 'flee'; ped.stateT = 0; }
        break;
      }
      default:
        ped.speed = 0;
    }
    // Nobody strolls into the deep lagoon.
    if (G.world.terrainAt(ped.x, ped.y) === 0) {
      movePed(G, ped, ped.home.x, ped.home.y, dt, 90);
    }
  }
  // The dead stay where they fell; the living step around them (implicitly, via targets).
  G.peds = G.peds.filter((ped) => !ped.remove);
}

/** Damage a pedestrian; rivals drop cash, witnesses drop the phone. */
export function hurtPed(G, ped, damage, fromPlayer) {
  if (ped.down) return;
  ped.hp -= damage;
  G.floaters.push({
    x: ped.x + G.rng.range(-6, 6), y: ped.y - 18,
    text: '-' + Math.round(damage), life: 0.8, maxLife: 0.8,
    colour: ped.hostile ? '#ffb08a' : '#f3e2bb', size: 15,
  });
  if (ped.hp <= 0) {
    ped.down = true;
    ped.speed = 0;
    if (fromPlayer) {
      G.police.reportCrime('kill', ped.x, ped.y);
      witnessCrime(G, ped.x, ped.y, 'shot');
      if (ped.hostile) {
        const cash = G.rng.int(20, 90);
        G.pickups.push({ kind: 'cash', x: ped.x, y: ped.y, amount: cash, bobPhase: G.rng.range(0, 6) });
        G.stats.rivalsDown += 1;
      }
    }
    return;
  }
  if (ped.armed && (ped.hostile || fromPlayer)) {
    ped.state = 'fight';
    ped.stateT = 0;
  } else if (fromPlayer) {
    ped.state = G.rng.chance(0.7) ? 'flee' : 'cower';
    ped.stateT = 0;
  }
}

/** A calm reset for staged scenes: clear panic, restore the named cast. */
export function resetPeds(G) {
  for (const ped of G.peds) {
    if (ped.down) continue;
    ped.state = 'stroll';
    ped.stateT = 0;
    ped.witnessT = 0;
    ped.calledIn = false;
  }
}

export { angleDelta, clamp };
