// Cars: player-drivable stealable vehicles + interstate truck/civilian traffic AI.
import { rng, rr, pick } from './rng.js';
import { EXPORT_CARS } from './config.js';

const COLORS = [0xc23b22, 0x2266c2, 0xd8d8d8, 0x2a2a2e, 0xe0a51e, 0x1e7a4c, 0x7a1e5e, 0x1e6e7a];
export function makeCarMesh(color, isTruck = false, name = '') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 70 });
  if (isTruck) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3), bodyMat); cab.position.set(0, 1.6, 3.4); cab.castShadow = true; g.add(cab);
    const box = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 7.5), new THREE.MeshLambertMaterial({ color: 0xd8d2c4 })); box.position.set(0, 2, -1.4); box.castShadow = true; g.add(box);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), bodyMat); body.position.y = 0.65; body.castShadow = true; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), new THREE.MeshPhongMaterial({ color: 0x18222e, shininess: 90 })); cabin.position.set(0, 1.25, -0.2); g.add(cabin);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.1), bodyMat); hood.position.set(0, 0.85, 2.1); g.add(hood);
  }
  const wheelG = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.05, 1.6], [1.05, 1.6], [-1.05, -1.6], [1.05, -1.6]]) {
    const w = new THREE.Mesh(wheelG, wheelM); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  hl.position.set(0, 0.8, isTruck ? 4.95 : 2.32); g.add(hl);
  g.userData.name = name;
  return g;
}

export class Traffic {
  constructor(scene) {
    this.cars = [];
    // Interstate trucks + cars, both directions
    for (let i = 0; i < 14; i++) {
      const truck = i % 3 === 0;
      const dir = i % 2 === 0 ? 1 : -1;
      const mesh = makeCarMesh(pick(COLORS), truck);
      const lane = dir > 0 ? -34 : -46;
      mesh.position.set(rr(-560, 560), 0, lane + rr(-2, 2));
      mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(mesh);
      this.cars.push({ mesh, speed: rr(14, 24) * dir, dir, truck, lane: mesh.position.z, kind: 'traffic' });
    }
    // Parked / roaming civilian cars in settlements (stealable)
    const spots = [[-300, 205], [-345, 240], [-160, 205], [-285, -240], [415, -255], [60, 145], [-40, -245], [300, 130], [-90, -55]];
    spots.forEach(([x, z], i) => {
      const name = EXPORT_CARS[i % EXPORT_CARS.length];
      const mesh = makeCarMesh(COLORS[i % COLORS.length], false, name);
      mesh.position.set(x, 0, z); mesh.rotation.y = rr(0, Math.PI * 2); scene.add(mesh);
      this.cars.push({ mesh, speed: 0, dir: 1, truck: false, lane: z, kind: 'parked', name, stolen: false, cond: 100 });
    });
    // The named mission Charger on the interstate shoulder
    const charger = makeCarMesh(0xe0a51e, false, EXPORT_CARS[0]);
    charger.position.set(6, 0, -58); charger.rotation.y = Math.PI / 2; scene.add(charger);
    this.charger = { mesh: charger, speed: 0, dir: 1, truck: false, lane: -58, kind: 'parked', name: EXPORT_CARS[0], stolen: false, cond: 100 };
    this.cars.push(this.charger);
  }
  update(dt) {
    for (const c of this.cars) {
      if (c.kind !== 'traffic') continue;
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 590) c.mesh.position.x = -590;
      if (c.mesh.position.x < -590) c.mesh.position.x = 590;
    }
  }
  nearestStealable(pos, maxD = 6) {
    let best = null, bd = maxD;
    for (const c of this.cars) { if (c.kind !== 'parked') continue; const d = c.mesh.position.distanceTo(pos); if (d < bd) { bd = d; best = c; } }
    return best;
  }
}

// Simple arcade car physics for the player's current vehicle.
export function driveCar(car, input, dt) {
  const accel = input.fwd ? 26 : input.back ? -14 : 0;
  car.speed += accel * dt; car.speed -= car.speed * 0.55 * dt;
  car.speed = Math.max(-16, Math.min(46, car.speed));
  if (Math.abs(car.speed) > 0.4) car.angle += input.steer * dt * 1.7 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 12);
  car.mesh.rotation.y = car.angle;
  car.mesh.position.x += Math.sin(car.angle) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.angle) * car.speed * dt;
  car.mesh.position.x = Math.max(-580, Math.min(580, car.mesh.position.x));
  car.mesh.position.z = Math.max(-430, Math.min(430, car.mesh.position.z));
  return car.speed;
}
