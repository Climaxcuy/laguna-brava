// Lead and machetes: how violence moves through Laguna Brava. Guns are fast projectiles
// stepped in small increments so a .30 carbine round cannot tunnel through a porch post;
// every shot leaves a tracer, a muzzle bloom and a noise the whole street hears. Melee is
// an arc and a grunt. Damage lands on people, on cars, and — through witnesses — on the
// player's reputation with the Patrulla Estatal.

import { WEAPONS } from './config.js';
import { clamp, dist } from './rng.js';
import { hurtPed } from './peds.js';

export function createCombat() {
  return {
    projectiles: [],
    recentShots: 0,   // seconds since the last shot anywhere: peds read it as "danger"
    playerShoot,
    pedShoot,
    update,
  };
}

function muzzle(G, x, y, angle) {
  G.particles.push({
    x: x + Math.cos(angle) * 14, y: y + Math.sin(angle) * 14,
    vx: Math.cos(angle) * 60, vy: Math.sin(angle) * 60,
    life: 0, maxLife: 0.07, size: 9, colour: 'rgba(255,205,110,0.9)', kind: 'flash',
  });
  for (let i = 0; i < 3; i += 1) {
    G.particles.push({
      x: x + Math.cos(angle) * 16, y: y + Math.sin(angle) * 16,
      vx: Math.cos(angle) * G.rng.range(40, 120) + G.rng.range(-30, 30),
      vy: Math.sin(angle) * G.rng.range(40, 120) + G.rng.range(-30, 30),
      life: 0, maxLife: G.rng.range(0.15, 0.3), size: 2, colour: '#ffd98a', kind: 'spark',
    });
  }
}

function fireProjectile(G, from, x, y, angle, weapon, owner) {
  const pellets = weapon.pellets ?? 1;
  for (let i = 0; i < pellets; i += 1) {
    const a = angle + G.rng.range(-weapon.spread, weapon.spread) + (pellets > 1 ? (i - (pellets - 1) / 2) * 0.045 : 0);
    G.combat.projectiles.push({
      x, y,
      vx: Math.cos(a) * weapon.speed,
      vy: Math.sin(a) * weapon.speed,
      damage: weapon.damage * G.rng.range(0.85, 1.15),
      from, owner,
      life: weapon.range / weapon.speed,
      trail: [],
    });
  }
  muzzle(G, x, y, angle);
  G.combat.recentShots = 2.2;
}

/** The player's trigger. Aim comes from G.aim (world point under the mouse). */
export function playerShoot(G) {
  const p = G.player;
  const slot = p.weaponSlot;
  const weapon = WEAPONS[slot - 1];
  const owned = p.weapons[slot];
  if (!weapon || !owned || !owned.owned) return;
  if (p.fireT > 0) return;
  if (owned.ammo <= 0) {
    G.audio.blip?.(220, 0.05, 'square', 0.1);
    p.fireT = 0.25;
    G.floaters.push({ x: p.x, y: p.y - 26, text: 'SIN BALAS', life: 0.8, maxLife: 0.8, colour: '#e8a33d', size: 14 });
    return;
  }
  p.fireT = weapon.rate;
  if (owned.ammo !== Infinity) owned.ammo -= 1;
  p.firing = true;
  const aimAngle = Math.atan2(G.aim.y - p.y, G.aim.x - p.x);
  p.angle = aimAngle;
  if (weapon.speed === 0) {
    // Melee: an arc in front, felt by people and by car panels alike.
    G.audio.swing();
    for (const ped of G.peds) {
      if (ped.down) continue;
      const d = dist(p.x, p.y, ped.x, ped.y);
      if (d < weapon.range + 8) {
        let da = Math.atan2(ped.y - p.y, ped.x - p.x) - aimAngle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 1.1) {
          hurtPed(G, ped, weapon.damage, true);
          G.audio.hit();
        }
      }
    }
    G.police.reportCrime('assault', p.x, p.y);
    return;
  }
  fireProjectile(G, 'player', p.x, p.y, aimAngle, weapon, p);
  if (weapon.sound === 'boom') G.audio.boom();
  else if (weapon.sound === 'crack') G.audio.crack();
  else G.audio.shot();
  G.camera.shake = Math.max(G.camera.shake, weapon.id === 'shotgun' ? 3.4 : 1.4);
  G.police.reportCrime('shot', p.x, p.y);
}

/** A hostile ped shoots at the player: lead in the air, panic on the street. */
export function pedShoot(G, ped) {
  const weapon = WEAPONS.find((w) => w.id === ped.weapon) ?? WEAPONS[2];
  const p = G.player;
  const lead = 0.22;
  const tx = p.x + (p.vx ?? 0) * lead;
  const ty = p.y + (p.vy ?? 0) * lead;
  const angle = Math.atan2(ty - ped.y, tx - ped.x) + G.rng.range(-0.05, 0.05);
  fireProjectile(G, 'ped', ped.x, ped.y, angle, weapon, ped);
  if (weapon.sound === 'boom') G.audio.boom();
  else G.audio.shot();
}

/** A round finds the player: armour eats most of it, health the rest. */
export function hurtPlayer(G, damage) {
  const p = G.player;
  if (p.dead || p.godT > 0) return;
  const through = p.armour > 0 ? damage * 0.42 : damage;
  if (p.armour > 0) p.armour = Math.max(0, p.armour - damage * 0.5);
  p.hp -= through;
  p.hurtT = 0.35;
  G.audio.hurt();
  G.camera.shake = Math.max(G.camera.shake, 2.2);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    G.onPlayerDown?.();
  }
}

function stepProjectile(G, pr, dt) {
  const steps = 3;
  const sdt = dt / steps;
  for (let s = 0; s < steps; s += 1) {
    pr.x += pr.vx * sdt;
    pr.y += pr.vy * sdt;
    pr.life -= sdt;
    if (pr.life <= 0) return false;
    if (G.world.blockedAt(pr.x, pr.y, 2)) {
      G.particles.push({
        x: pr.x, y: pr.y, vx: G.rng.range(-30, 30), vy: G.rng.range(-30, 30),
        life: 0, maxLife: 0.3, size: 3, colour: 'rgba(190,170,140,0.6)', kind: 'smoke',
      });
      return false;
    }
    // People.
    for (const ped of G.peds) {
      if (ped.down || pr.owner === ped) continue;
      if (pr.from === 'ped' && !ped.hostile && ped !== G.playerPed) {
        // Rival rounds can still catch bystanders — that is why the street empties.
        if (dist(pr.x, pr.y, ped.x, ped.y) < 8 && G.rng.chance(0.4)) {
          hurtPed(G, ped, pr.damage * 0.7, false);
          return false;
        }
        continue;
      }
      if (dist(pr.x, pr.y, ped.x, ped.y) < 8) {
        hurtPed(G, ped, pr.damage, pr.from === 'player');
        return false;
      }
    }
    // The player, when the round is not theirs.
    const p = G.player;
    if (pr.from !== 'player' && p.mode === 'foot' && dist(pr.x, pr.y, p.x, p.y) < 9) {
      hurtPlayer(G, pr.damage);
      return false;
    }
    // Cars, including the one the player is driving.
    for (const car of G.cars) {
      if (car.sunk) continue;
      const rr = car.model.l * 0.42;
      if (dist(pr.x, pr.y, car.x, car.y) < rr) {
        car.health -= pr.damage * 0.55;
        G.particles.push({
          x: pr.x, y: pr.y, vx: G.rng.range(-60, 60), vy: G.rng.range(-60, 60),
          life: 0, maxLife: 0.25, size: 2, colour: '#ffd98a', kind: 'spark',
        });
        if (car.driver === 'player' || (p.mode === 'car' && p.car === car)) {
          hurtPlayer(G, pr.damage * 0.25);
        }
        if (car.health <= 0 && !car.wrecked) {
          car.wrecked = true;
          car.speed = 0;
          if (car.driver === 'cop') G.police.onCopWrecked(car, pr.from === 'player');
          G.floaters.push({ x: car.x, y: car.y - 36, text: 'WRECKED', life: 1.3, maxLife: 1.3, colour: '#e8a33d', size: 15 });
        }
        if (pr.from === 'player' && car.driver === 'cop') G.police.reportCrime('shot', pr.x, pr.y);
        return false;
      }
    }
    // Airboats take rounds in the hull.
    for (const boat of G.boats) {
      if (dist(pr.x, pr.y, boat.x, boat.y) < 20) {
        boat.hull -= pr.damage * 0.5;
        if (boat.driver === 'player') hurtPlayer(G, pr.damage * 0.2);
        return false;
      }
    }
  }
  pr.trail.push({ x: pr.x, y: pr.y });
  if (pr.trail.length > 3) pr.trail.shift();
  return true;
}

export function update(G, dt) {
  const combat = G.combat;
  if (combat.recentShots > 0) combat.recentShots -= dt;
  combat.projectiles = combat.projectiles.filter((pr) => stepProjectile(G, pr, dt));
}

/** Select a weapon slot if owned; the HUD strip and the hands agree. */
export function selectWeapon(G, slot) {
  const p = G.player;
  if (p.weapons[slot]?.owned) {
    p.weaponSlot = slot;
    G.audio.blip?.(440, 0.05, 'square', 0.08);
  }
}

export { clamp };
