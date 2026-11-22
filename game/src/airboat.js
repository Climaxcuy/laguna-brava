// Pilotable airboat: fan-driven, slides on water and mud, beaches on mud banks.
import { inChannel } from './world.js';

export class Airboat {
  constructor(scene) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 5.6), new THREE.MeshPhongMaterial({ color: 0x8a6a30, shininess: 40 }));
    hull.position.y = 0.5; hull.castShadow = true; g.add(hull);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a2c1c }));
    seat.position.set(0, 1.1, 0.6); g.add(seat);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 6, 14), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cage.position.set(0, 1.9, -2.2); g.add(cage);
    this.fan = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.5), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
    this.fan.position.set(0, 1.9, -2.2); g.add(this.fan);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pole.position.set(0, 1.1, -2.2); g.add(pole);
    g.position.set(300, 0.2, 306); g.rotation.y = Math.PI;
    scene.add(g);
    this.mesh = g; this.angle = Math.PI; this.vx = 0; this.vz = 0; this.speed = 0; this.aboard = false; this.boost = 1;
    // Fan spray particles
    const N = 90; this.sprayN = N;
    this.sprayPos = new Float32Array(N * 3); this.sprayVel = [];
    for (let i = 0; i < N; i++) { this.sprayVel.push({ x: 0, y: 0, z: 0, life: 0 }); this.sprayPos[i * 3 + 1] = -50; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(this.sprayPos, 3));
    this.spray = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xdff6ff, size: 0.55, transparent: true, opacity: 0.85 }));
    scene.add(this.spray); this.sprayIdx = 0;
  }
  get pos() { return this.mesh.position; }
  update(dt, input, rng) {
    const p = this.mesh.position;
    if (this.aboard) {
      if (input.steer) this.angle += input.steer * dt * 1.15; // rudder turns slowly: she slides
      const thrust = (input.fwd ? 15 : input.back ? -6 : 0) * this.boost;
      // Fan pushes along heading; velocity keeps its own direction = classic airboat slide.
      this.vx += Math.sin(this.angle) * thrust * dt;
      this.vz += Math.cos(this.angle) * thrust * dt;
    }
    const onWater = inChannel(p.x, p.z) || (Math.hypot(p.x - 430, p.z - 300) < 85);
    const drag = onWater ? 0.35 : 1.6; // mud grips: beaching bleeds speed fast
    this.vx -= this.vx * drag * dt; this.vz -= this.vz * drag * dt;
    p.x += this.vx * dt; p.z += this.vz * dt;
    p.x = Math.max(180, Math.min(560, p.x)); p.z = Math.max(10, Math.min(420, p.z));
    p.y = onWater ? 0.2 + Math.sin(p.x * 0.05) * 0.06 : 0.55; // rides up when beached on mud
    this.beached = !onWater && Math.hypot(this.vx, this.vz) < 0.6;
    this.mesh.rotation.y = this.angle;
    this.mesh.rotation.z = THREE.MathUtils.clamp(-(this.vx * Math.cos(this.angle) - this.vz * Math.sin(this.angle)) * 0.012, -0.16, 0.16);
    this.speed = Math.hypot(this.vx, this.vz);
    this.fan.rotation.x += this.speed * dt * 4 + (this.aboard ? dt * 6 : 0);
    // Spray behind the fan when moving on water
    if (this.aboard && this.speed > 3 && onWater) {
      for (let s = 0; s < 3; s++) {
        const v = this.sprayVel[this.sprayIdx], i3 = this.sprayIdx * 3;
        this.sprayPos[i3] = p.x - Math.sin(this.angle) * 3 + (rng() - 0.5) * 2;
        this.sprayPos[i3 + 1] = 0.7 + rng() * 0.8;
        this.sprayPos[i3 + 2] = p.z - Math.cos(this.angle) * 3 + (rng() - 0.5) * 2;
        v.x = -Math.sin(this.angle) * 3 + (rng() - 0.5) * 3; v.y = 2.2 + rng() * 2; v.z = -Math.cos(this.angle) * 3 + (rng() - 0.5) * 3; v.life = 0.7;
        this.sprayIdx = (this.sprayIdx + 1) % this.sprayN;
      }
    }
    for (let i = 0; i < this.sprayN; i++) {
      const v = this.sprayVel[i]; if (v.life <= 0) continue; v.life -= dt;
      this.sprayPos[i * 3] += v.x * dt; this.sprayPos[i * 3 + 1] += v.y * dt; this.sprayPos[i * 3 + 2] += v.z * dt;
      v.y -= 6 * dt; if (v.life <= 0) this.sprayPos[i * 3 + 1] = -50;
    }
    this.spray.geometry.attributes.position.needsUpdate = true;
    return this.speed;
  }
}
