// Patrulla Estatal: named units with roles, roadblocks, GARZA air unit with spotlight.
import { POLICE_NAMES } from './config.js';
import { makeCarMesh } from './vehicles.js';
const ROLES = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SPOTLIGHT', 'FIRING'];
export class Police {
  constructor(scene) {
    this.units = [];
    for (let i = 0; i < 5; i++) {
      const mesh = makeCarMesh(0xf0f0f0, false);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.3, 4.65), new THREE.MeshBasicMaterial({ color: 0x1e4fa0 }));
      stripe.position.y = 0.72; mesh.add(stripe);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      bar.position.set(0, 1.7, -0.2); mesh.add(bar); mesh.userData.bar = bar;
      mesh.position.set(600, 0, 400); scene.add(mesh);
      this.units.push({ name: POLICE_NAMES[i], role: ROLES[i], mesh, speed: 0, angle: 0, active: false, dist: 0 });
    }
    // GARZA helicopter
    const h = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 6), new THREE.MeshPhongMaterial({ color: 0x24303e, shininess: 60 })); h.add(fus);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 5), new THREE.MeshLambertMaterial({ color: 0x24303e })); tail.position.z = -5; h.add(tail);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 })); this.rotor.position.y = 1.4; h.add(this.rotor);
    const spot = new THREE.SpotLight(0xfff6c8, 2.4, 130, 0.32, 0.4); spot.position.set(0, -1, 0); h.add(spot); h.add(spot.target);
    this.spotTarget = spot.target;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 34, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    cone.position.y = -18; h.add(cone);
    h.position.set(600, 60, 400); scene.add(h);
    this.heli = { name: 'GARZA', role: 'SPOTLIGHT', mesh: h, active: false, dist: 0 };
    this.roadblockAt = null;
  }
  neededUnits(wanted) { return wanted <= 0 ? 0 : Math.min(5, wanted); }
  update(dt, G) {
    const target = G.playerPos;
    const n = this.neededUnits(G.wanted);
    this.units.forEach((u, i) => {
      u.active = i < n;
      u.mesh.visible = u.active || G.shotMode;
      if (!u.active) { u.dist = 0; return; }
      const p = u.mesh.position;
      if (p.x > 590 && p.z > 390) { p.set(target.x + (i - 2) * 18, 0, target.z + 24 + i * 4); } // spawn in
      const d = Math.hypot(target.x - p.x, target.z - p.z); u.dist = Math.round(d);
      const want = u.role === 'ROADBLOCK' ? 26 : u.role === 'FIRING' ? 15 : 8;
      if (d > want) {
        const a = Math.atan2(target.x - p.x, target.z - p.z);
        let sp = Math.min(34, 16 + G.wanted * 3.4);
        if (u.role === 'RAMMING') sp *= 1.12;
        p.x += Math.sin(a) * sp * dt; p.z += Math.cos(a) * sp * dt;
        u.mesh.rotation.y = a; u.speed = sp;
        if (u.role === 'ROADBLOCK' && d < 60) { p.x = target.x + Math.sin(G.playerAngle) * 30; p.z = target.z + Math.cos(G.playerAngle) * 30; }
      } else { u.speed = 0; u.mesh.rotation.y = Math.atan2(target.x - p.x, target.z - p.z); if (u.role === 'FIRING' && G.tick % 50 === 0) G.damagePlayer(2); }
      if (u.mesh.userData.bar) u.mesh.userData.bar.material.color.setHex(G.tick % 30 < 15 ? 0xff2a2a : 0x2a6eff);
    });
    const h = this.heli; h.active = G.wanted >= 4;
    h.mesh.visible = h.active || G.shotMode === 1;
    if (h.active || G.shotMode === 1) {
      const hp = h.mesh.position;
      const tx = target.x + Math.sin(G.tick * 0.008) * 14, tz = target.z + Math.cos(G.tick * 0.008) * 14;
      hp.x += (tx - hp.x) * dt * 1.4; hp.z += (tz - hp.z) * dt * 1.4; hp.y = 30;
      h.dist = Math.round(Math.hypot(target.x - hp.x, target.z - hp.z));
      this.spotTarget.position.set(target.x - hp.x, -30, target.z - hp.z);
      this.rotor.rotation.y += dt * 22;
      G.inSpotlight = Math.hypot(target.x - hp.x, target.z - hp.z) < 12;
    }
  }
  dispatchRows(G) {
    const rows = this.units.filter(u => u.active).map(u => ({ name: u.name, role: u.role, dist: u.dist }));
    if (this.heli.active) rows.push({ name: 'GARZA', role: 'SPOTLIGHT', dist: this.heli.dist });
    return rows;
  }
}
