// On-foot shooting: muzzle glow, tracer, floating damage numbers, health/armor.
import { WEAPONS } from './config.js';
export class Combat {
  constructor(scene, G) {
    this.G = G; this.cool = 0;
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0 }));
    scene.add(this.flash);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffe98a, transparent: true, opacity: 0 }));
    scene.add(this.tracer);
    this.layer = document.getElementById('dmgLayer');
  }
  shoot(dt) {
    const G = this.G; this.cool -= dt;
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 9);
    this.tracer.material.opacity = Math.max(0, this.tracer.material.opacity - dt * 7);
    if (!G.firingNow || G.mode !== 'foot' || this.cool > 0) return;
    const w = WEAPONS[G.weapon]; if (typeof w.ammo === 'number' && G.ammo[G.weapon] <= 0) return;
    this.cool = 0.16; if (typeof w.ammo === 'number') G.ammo[G.weapon]--;
    G.sfx.shot(); G.stats.shots++;
    const from = G.playerPos.clone(); from.y = 1.5;
    // Aim at nearest hostile / pedestrian in front, else forward
    let target = null, bd = 46;
    for (const p of G.peds.list) { if (p.hp <= 0) continue; const d = p.mesh.position.distanceTo(from); if (d < bd) { bd = d; target = p; } }
    for (const u of G.police.units) { if (!u.active) continue; const d = u.mesh.position.distanceTo(from); if (d < bd) { bd = d; target = { mesh: u.mesh, hp: 999, cop: true }; } }
    const dir = target ? target.mesh.position.clone().sub(from).normalize() : new THREE.Vector3(Math.sin(G.playerAngle), 0, Math.cos(G.playerAngle));
    const end = from.clone().add(dir.multiplyScalar(target ? bd : 30)); end.y = 1.2;
    this.flash.position.copy(from).add(new THREE.Vector3(Math.sin(G.playerAngle) * 0.7, 0.15, Math.cos(G.playerAngle) * 0.7));
    this.flash.material.opacity = 1;
    const pos = this.tracer.geometry.attributes.position.array;
    pos[0] = from.x; pos[1] = 1.5; pos[2] = from.z; pos[3] = end.x; pos[4] = 1.2; pos[5] = end.z;
    this.tracer.geometry.attributes.position.needsUpdate = true; this.tracer.material.opacity = 1;
    if (target) {
      const dmg = w.dmg + Math.floor(G.rng() * 8);
      target.hp -= dmg; G.stats.hits++;
      this.damageNumber(end, dmg);
      if (!target.cop) { target.panic = 4; if (target.hp <= 0) { G.addWanted(1, 'Shots fired — a civilian is down!'); } }
      else G.addWanted(1, 'Officer under fire!');
      if (G.missionState && G.missionState.mission.id === 3 && G.missionState.stage === 1 && target.hp <= 0 && !target.cop) {
        G.missionState.kills = (G.missionState.kills || 0) + 1;
      }
    }
  }
  damageNumber(worldPos, dmg) {
    const el = document.createElement('div'); el.className = 'dmg'; el.textContent = '-' + dmg;
    el.style.left = (44 + (worldPos.x % 12)) + '%'; el.style.top = '38%';
    this.layer.appendChild(el);
    let t = 0; const iv = setInterval(() => { t += 1; el.style.top = (38 - t * 2) + '%'; el.style.opacity = String(1 - t / 18); if (t > 18) { clearInterval(iv); el.remove(); } }, 40);
    this.lastDamage = dmg;
  }
}
