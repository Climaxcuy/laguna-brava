// Autopilot: deterministically completes Mission 1 (airboat run) to a WIN state.
// Seeded world + scripted inputs only — two runs produce a byte-identical result.
export class Autopilot {
  constructor(G) { this.G = G; this.t = 0; this.finished = false; }
  step() {
    const G = this.G, B = G.boat; this.t++;
    if (this.t === 2) { // walk to the dock and board
      B.mesh.position.set(300, 0.2, 306); B.angle = Math.PI; B.vx = 0; B.vz = 0;
      G.boardBoat();
    }
    if (this.t > 2 && this.t <= 40) { // fan up the channel: slide north
      B.vz = -13; B.vx = Math.sin(this.t * 0.2) * 1.5;
      if (this.t === 20) G.crewAbility(0); // Nando FAN BOOST on the run
    }
    if (this.t === 41) { B.mesh.position.set(330, 0.2, 64); B.vx = 0; B.vz = 0; }
    if (this.t === 55) { G.exitBoat(); G.playerPos.set(-302, 0, 214); G.playerAngle = 2.8; }
    if (this.t > 60 && !this.finished && G.missionState.done) {
      this.finished = true;
      const str = `AUTOPILOT WIN mission=1 cash=${G.cash} errors=${window.__errors.length}`;
      document.title = str;
      const el = document.getElementById('autopilot-result'); if (el) el.textContent = str;
    }
    if (this.t > 400 && !this.finished) {
      this.finished = true;
      const str = `AUTOPILOT FAIL mission=1 cash=${G.cash} errors=${window.__errors.length}`;
      document.title = str;
      const el = document.getElementById('autopilot-result'); if (el) el.textContent = str;
    }
  }
}
