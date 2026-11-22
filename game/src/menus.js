// Title screen, stats/save screen, rank ladder, save slots (localStorage).
import { MISSIONS, RANKS, EXPORT_CARS } from './config.js';
import { RAMPS, JUGS } from './world.js';
const $ = (id) => document.getElementById(id);
export function percentComplete(G) {
  const total = 7 + 12 + 10 + 15;
  const done = G.stats.missionsDone + G.stuntsDone + G.exportsDone + G.jugs;
  return Math.floor(done / total * 100);
}
export function saveData(G, slot) {
  const data = { cash: G.cash, respect: G.respect, missionIndex: G.missionIndex, stunts: G.stuntsDone, exports: G.exportsDone, jugs: G.jugs, missionsDone: G.stats.missionsDone };
  try { localStorage.setItem('laguna-brava-' + slot, JSON.stringify(data)); } catch {}
  return data;
}
export function loadData(G, slot) {
  try { const raw = localStorage.getItem('laguna-brava-' + slot); if (!raw) return null; const d = JSON.parse(raw); Object.assign(G, { cash: d.cash, respect: d.respect, missionIndex: d.missionIndex, stuntsDone: d.stunts, exportsDone: d.exports, jugs: d.jugs }); G.stats.missionsDone = d.missionsDone; return d; } catch { return null; }
}
export function slotSummary(slot) {
  try { const raw = localStorage.getItem('laguna-brava-' + slot); if (!raw) return null; return JSON.parse(raw); } catch { return null; }
}
export function renderTitleSlots(G) {
  $('titleSlots').innerHTML = [1, 2, 3].map(s => { const d = slotSummary(s); return `<div class="tslot" data-slot="${s}"><b>SLOT ${s}</b><br>${d ? `Cash $${d.cash} · REP ${d.respect}<br>Missions ${d.missionsDone}/7 · Exports ${d.exports}/10` : 'EMPTY — start a new Brava run<br>Missions 0/7 · Exports 0/10'}</div>`; }).join('');
  document.querySelectorAll('.tslot').forEach(el => el.addEventListener('click', () => { const s = +el.dataset.slot; if (loadData(G, s)) { G.feed('💾 Loaded slot ' + s); G.missions.reset(); } }));
}
export function renderStats(G) {
  $('pctComplete').textContent = percentComplete(G) + '% COMPLETE';
  $('checklist').innerHTML =
    `Missions: ${G.stats.missionsDone}/7 ${G.stats.missionsDone >= 7 ? '✔' : ''}<br>Stunts: ${G.stuntsDone}/12 ${G.stuntsDone >= 12 ? '✔' : ''}<br>Exports: ${G.exportsDone}/10 ${G.exportsDone >= 10 ? '✔' : ''}<br>Collectibles (moonshine jugs): ${G.jugs}/15 ${G.jugs >= 15 ? '✔' : ''}`;
  $('medals').innerHTML = MISSIONS.map(m => `${m.title}: <b>${G.completedMissions[m.id] || '— not yet'}</b>`).join('<br>');
  $('career').innerHTML = `Cash earned (career): $${G.stats.earned}<br>Shots fired: ${G.stats.shots} · Hits: ${G.stats.hits}<br>Cars stolen: ${G.stats.stolen} · Airboat slides: ${G.stats.slides}<br>Time in Laguna: ${Math.floor(G.stats.timeMin)} min`;
  let nextUnlock = 'Sniper slot at REP 220';
  $('rankLadder').innerHTML = RANKS.map(([need, t], i) => {
    const has = G.respect >= need; if (has && RANKS[i + 1]) nextUnlock = RANKS[i + 1][1] + ' at REP ' + RANKS[i + 1][0];
    return `${has ? '✔' : '🔒'} ${t} — REP ${need}`;
  }).join('<br>') + `<br><br>NEXT UNLOCK: <b style="color:#ffd98a">${nextUnlock}</b><br>Next export car: ${EXPORT_CARS[G.exportsDone % 10]}`;
  $('saveSlots').innerHTML = [1, 2, 3].map(s => { const d = slotSummary(s); return `<div>SLOT ${s}: ${d ? `$${d.cash} · REP ${d.respect} · ${d.missionsDone}/7 missions` : 'EMPTY'} <button class="act" data-save="${s}">SAVE</button> <button class="act" data-load="${s}">LOAD</button></div>`; }).join('');
  document.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () => { saveData(G, +b.dataset.save); G.feed('💾 Saved to slot ' + b.dataset.save); renderStats(G); }));
  document.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { if (loadData(G, +b.dataset.load)) { G.feed('💾 Loaded slot ' + b.dataset.load); G.missions.reset(); renderStats(G); } }));
}
