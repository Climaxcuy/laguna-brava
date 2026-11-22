// Seven staged story missions for Tío Braulio Fuentes and his circle.
import { MISSIONS } from './config.js';
export class Missions {
  constructor(G) { this.G = G; this.reset(); }
  reset() {
    const G = this.G;
    G.missionState = { mission: MISSIONS[G.missionIndex % MISSIONS.length], stage: 0, kills: 0, done: false };
    this.showIntro();
  }
  showIntro() {
    const G = this.G, m = G.missionState.mission;
    G.showDialogue(m.avatar, m.giver, m.role, m.line);
    G.feed('⭐ New mission: ' + m.title);
  }
  currentTarget() { const s = this.G.missionState; return s.mission.stages[s.stage]; }
  update() {
    const G = this.G, s = G.missionState; if (s.done) return;
    const st = s.mission.stages[s.stage]; if (!st) return;
    const d = Math.hypot(G.playerPos.x - st.x, G.playerPos.z - st.z);
    let ok = d < 11;
    if (st.mode === 'airboat') ok = ok && G.mode === 'boat';
    if (st.mode === 'car') ok = ok && G.mode === 'car';
    if (st.mode === 'steal') ok = d < 9 && G.mode === 'car';
    if (st.mode === 'combat') { ok = (s.kills || 0) >= 3; if (ok) G.showDialogue('👩🏽‍🔧', 'Lupe', 'Wheel Witch', 'Plaza is ours. Now run, before the Patrulla Estatal rolls in!'); }
    if (st.mode === 'mayhem') ok = G.wanted >= 4;
    if (!ok) return;
    s.stage++;
    if (s.stage >= s.mission.stages.length) this.complete();
    else G.feed('✔ Stage cleared — ' + s.mission.stages[s.stage].text);
  }
  complete() {
    const G = this.G, s = G.missionState, m = s.mission;
    s.done = true; G.cash += m.pay; G.respect += m.rep; G.stats.missionsDone++;
    G.completedMissions[m.id] = '🥇 GOLD';
    G.sfx.cash();
    G.showBanner('MISSION PASSED', '+' + '$' + m.pay + ' · +' + m.rep + ' REP · Unlocked: ' + (m.id === 1 ? 'Interstate Muscle' : m.id === 3 ? 'Scattergun discount' : m.id === 5 ? 'Sniper slot (locked → open at REP 220)' : 'Export bonus x2'));
    G.feed('🏆 ' + m.title + ' complete — $' + m.pay);
    G.missionIndex++;
    setTimeout(() => { if (!G.shotMode && !G.autopilot) this.reset(); }, 4000);
  }
}
