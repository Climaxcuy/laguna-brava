// HUD on all four sides + dialogue, banners, prompts, printouts, crew cards, weapon wheel.
import { WEAPONS, CREW, RADIO, RANKS } from './config.js';
const $ = (id) => document.getElementById(id);
export class Hud {
  constructor(G) {
    this.G = G; this.feedLines = [];
    $('weaponWheel').innerHTML = WEAPONS.map((w, i) => `<div class="slot ${w.locked ? 'locked' : ''}" id="slot${i}"><span class="ic">${w.icon}</span>${w.name}<br><span id="ammo${i}">${w.ammo}</span>${w.locked ? ' 🔒' : ''}<br>$${w.price}</div>`).join('');
    $('crew').innerHTML = CREW.map((c, i) => `<div class="crewCard"><div class="av">${c.icon}</div><b>${c.name}</b><br>${c.ability} [${c.key}]<br><span class="cd" id="crewCd${i}">READY</span></div>`).join('');
  }
  feed(msg) { this.feedLines.unshift(msg); this.feedLines = this.feedLines.slice(0, 4); $('dispatchFeed').innerHTML = this.feedLines.join('<br>'); }
  showDialogue(avatar, name, role, line) {
    $('dlgAvatar').textContent = avatar; $('dlgName').textContent = name; $('dlgRole').textContent = role; $('dlgLine').textContent = line;
    $('dialogue').style.display = 'block'; clearTimeout(this._dlgT); this._dlgT = setTimeout(() => $('dialogue').style.display = 'none', 6500);
  }
  showBanner(title, sub) { $('banner').querySelector('h1').textContent = title; $('bannerSub').textContent = sub; $('banner').style.display = 'block'; clearTimeout(this._bT); this._bT = setTimeout(() => $('banner').style.display = 'none', 3600); }
  printout(txt) { $('printout').textContent = txt; $('printout').style.display = 'block'; clearTimeout(this._pT); this._pT = setTimeout(() => $('printout').style.display = 'none', 3000); }
  update() {
    const G = this.G, s = G.missionState;
    if (s && !s.done) {
      const st = s.mission.stages[s.stage];
      $('mTitle').textContent = '⭐ ' + s.mission.title.toUpperCase();
      $('mStage').textContent = 'STAGE ' + (s.stage + 1) + '/' + s.mission.stages.length;
      $('mObj').textContent = st ? st.text : '';
      $('mNext').textContent = 'NEXT: ' + (st ? st.next : '');
    } else { $('mTitle').textContent = 'LAGUNA BRAVA'; $('mStage').textContent = 'FREE ROAM'; $('mObj').textContent = 'All jobs done — stunt, export, collect jugs.'; $('mNext').textContent = 'NEXT: M map · P stats'; }
    const hh = String(6 + Math.floor(G.clockMin / 60) % 18).padStart(2, '0'), mm = String(Math.floor(G.clockMin % 60)).padStart(2, '0');
    $('clock').textContent = `${hh}:${mm} · DAY ${G.day}` + (G.night ? ' · 🌙 NIGHT' : '');
    $('cash').textContent = '$' + G.cash.toLocaleString('en-US');
    $('stars').textContent = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
    $('wantedState').textContent = G.wanted === 0 ? 'NOT WANTED' : (G.inSpotlight || G.wantedVisible ? 'IN SIGHT' : 'SEARCHING');
    $('dispatchUnits').innerHTML = G.police.dispatchRows(G).map(u => `<div class="unit"><span>🚓 ${u.name} · ${u.role}</span><span>${u.dist} m</span></div>`).join('') || '<div class="unit"><span>No active units</span><span>—</span></div>';
    WEAPONS.forEach((w, i) => { const el = $('slot' + i); if (el) el.className = 'slot' + (w.locked && G.respect < 220 ? ' locked' : '') + (G.weapon === i ? ' sel' : ''); const a = $('ammo' + i); if (a) a.textContent = G.ammo[i]; });
    $('districtName').textContent = G.district + (G.mode === 'boat' && G.boat.beached ? ' · BEACHED ON MUD' : '');
    let rank = RANKS[0][1]; for (const [need, t] of RANKS) if (G.respect >= need) rank = t;
    $('rankTitle').textContent = rank; $('respectXY').textContent = G.respect + '/340';
    $('respectBar').style.width = Math.min(100, G.respect / 3.4) + '%';
    const st = RADIO[G.radioIdx];
    $('radioBox').innerHTML = `📻 ${st.name} — ${st.tracks[G.trackIdx % st.tracks.length]}`;
    $('vehModel').textContent = G.mode === 'boat' ? '🛶 AIRBOAT “Fan Dancer”' : G.mode === 'car' && G.car ? '🚗 ' + (G.car.name || 'Stolen Car') : 'ON FOOT';
    $('vehCond').textContent = G.mode === 'car' && G.car ? Math.round(G.car.cond) + '%' : G.mode === 'boat' ? 'HULL 92%' : '—';
    $('speed').textContent = Math.round(Math.abs(G.speedNow) * 3.6);
    $('gear').textContent = G.mode === 'foot' ? 'N' : G.speedNow > 1 ? 'D' : G.speedNow < -0.5 ? 'R' : 'N';
    $('hpBar').style.width = Math.max(0, G.hp) + '%'; $('arBar').style.width = Math.max(0, G.armor) + '%';
    CREW.forEach((c, i) => { const el = $('crewCd' + i); if (el) el.textContent = G.crewCd[i] > 0 ? 'CD ' + Math.ceil(G.crewCd[i]) + 's' : 'READY'; });
    const pr = $('prompt');
    if (G.promptText) { pr.textContent = G.promptText; pr.style.display = 'block'; } else pr.style.display = 'none';
  }
}
