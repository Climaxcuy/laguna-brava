// Pedestrians wandering settlements; witnesses can call in crimes.
import { rr, pick } from './rng.js';
const SKIN = [0xc98a5e, 0x8a5a34, 0xe0aa7a, 0x6e4526];
const SHIRT = [0xc23b22, 0x2266c2, 0xe0d8c8, 0x2e7a4c, 0xe0a51e, 0x7a3a6e];
export class Pedestrians {
  constructor(scene) {
    this.list = [];
    const centers = [[-320, 220], [-300, -260], [430, -280], [-160, 300]];
    for (let i = 0; i < 26; i++) {
      const [cx, cz] = centers[i % centers.length];
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.05, 0.4), new THREE.MeshLambertMaterial({ color: pick(SHIRT) }));
      body.position.y = 1.05; body.castShadow = true; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshLambertMaterial({ color: pick(SKIN) }));
      head.position.y = 1.85; g.add(head);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.35), new THREE.MeshLambertMaterial({ color: 0x2c3038 }));
      legs.position.y = 0.28; g.add(legs);
      g.position.set(cx + rr(-70, 70), 0, cz + rr(-55, 55));
      scene.add(g);
      this.list.push({ mesh: g, angle: rr(0, 6.28), speed: rr(0.8, 1.6), cx, cz, panic: 0, hp: 30 });
    }
  }
  update(dt, playerPos) {
    for (const p of this.list) {
      if (p.hp <= 0) { p.mesh.rotation.x = Math.PI / 2; continue; }
      if (p.panic > 0) { p.panic -= dt; p.angle = Math.atan2(p.mesh.position.x - playerPos.x, p.mesh.position.z - playerPos.z); p.mesh.position.x += Math.sin(p.angle) * 4.2 * dt; p.mesh.position.z += Math.cos(p.angle) * 4.2 * dt; continue; }
      if (Math.hypot(p.mesh.position.x - p.cx, p.mesh.position.z - p.cz) > 80) p.angle += Math.PI * 0.9 * dt;
      else if (Math.random() < 0) {} // deterministic: no Math.random in logic
      p.mesh.position.x += Math.sin(p.angle) * p.speed * dt;
      p.mesh.position.z += Math.cos(p.angle) * p.speed * dt;
      p.mesh.rotation.y = p.angle;
      p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.008 + p.cx)) * 0.05;
    }
  }
  witnessCrime(pos, G) {
    for (const p of this.list) {
      if (p.hp > 0 && p.mesh.position.distanceTo(pos) < 26) {
        p.panic = 3;
        G.feed('📞 Witness: “A man just stole a car in ' + G.district + '!” — call to Patrulla Estatal');
        return true;
      }
    }
    return false;
  }
}
