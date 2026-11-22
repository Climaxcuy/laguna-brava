// Round textured minimap + full map screen with districts, standing, GPS route.
import { DISTRICTS, EXPORT_CARS } from './config.js';
import { RAMPS, JUGS } from './world.js';
function worldToMap(x, z, S) { return [ (x + 600) / 1200 * S, (z + 450) / 900 * S ]; }
export function drawMinimap(G) {
  const cv = document.getElementById('minimap'), g = cv.getContext('2d'), S = 180;
  g.clearRect(0, 0, S, S);
  // Clip round, center on player with fixed scale
  g.save(); g.beginPath(); g.arc(90, 90, 88, 0, 7); g.clip();
  g.fillStyle = '#33482a'; g.fillRect(0, 0, S, S);
  const scale = 0.55, px = G.playerPos.x, pz = G.playerPos.z;
  const toM = (x, z) => [90 + (x - px) * scale, 90 + (z - pz) * scale];
  // water channel
  g.fillStyle = '#1d5d6e'; const [cx0, cz0] = toM(285, 40), [cx1, cz1] = toM(375, 330); g.fillRect(cx0, cz0, cx1 - cx0, cz1 - cz0);
  // roads
  g.strokeStyle = '#888'; g.lineWidth = 5;
  for (const r of [[-600, -40, 600, -40], [-320, -220, -320, 340], [120, -80, 120, 400], [430, -300, 430, 60], [-480, 220, 160, 220], [-420, -260, 300, -260]]) {
    const [ax, ay] = toM(r[0], r[1]), [bx, by] = toM(r[2], r[3]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  }
  // search zone
  if (G.wanted > 0) { g.fillStyle = 'rgba(255,60,60,.25)'; g.beginPath(); g.arc(90, 90, 30 + G.wanted * 9, 0, 7); g.fill(); }
  // GPS route to objective
  const t = G.missionTarget; if (t) { const [tx, ty] = toM(t.x, t.z); g.strokeStyle = '#ffd23e'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(90, 90); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(tx, ty, 5, 0, 7); g.fill(); }
  // blips
  for (const c of G.traffic.cars) { if (c.kind !== 'parked') continue; const [x, y] = toM(c.mesh.position.x, c.mesh.position.z); g.fillStyle = '#9be7ff'; g.fillRect(x - 2, y - 2, 4, 4); }
  for (const u of G.police.units) { if (!u.active) continue; const [x, y] = toM(u.mesh.position.x, u.mesh.position.z); g.fillStyle = '#ff4040'; g.fillRect(x - 2, y - 2, 4, 4); }
  for (const r of RAMPS) { if (r.done) continue; const [x, y] = toM(r.x, r.z); g.fillStyle = '#ff8c3a'; g.fillRect(x - 2, y - 2, 4, 4); }
  // player arrow
  g.fillStyle = '#fff'; g.save(); g.translate(90, 90); g.rotate(G.playerAngle); g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore();
  g.restore();
}
export function drawFullMap(G) {
  const cv = document.getElementById('fullMap'), g = cv.getContext('2d'), W = 640, H = 480;
  g.fillStyle = '#26361f'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${(i % 7) * 0.02})`; g.fillRect((i * 53) % W, (i * 37) % H, 4, 4); }
  const toM = (x, z) => worldToMap(x, z, W).map((v, i) => i === 0 ? v : (z + 450) / 900 * H);
  g.fillStyle = '#1d5d6e'; const [wx, wy] = toM(285, 40); g.fillRect(wx, wy, (375 - 285) / 1200 * W, (330 - 40) / 900 * H);
  g.fillStyle = '#1d5d6e'; g.beginPath(); const [bx, by] = toM(470, -330); g.fillRect(bx - 90, by - 50, 190, 100);
  g.strokeStyle = '#999'; g.lineWidth = 7; g.beginPath(); let [ax, ay] = toM(-600, -40); g.moveTo(ax, ay); [ax, ay] = toM(600, -40); g.lineTo(ax, ay); g.stroke();
  g.lineWidth = 4; for (const r of [[-320, -220, -320, 340], [120, -80, 120, 400], [430, -300, 430, 60], [-480, 220, 160, 220], [-420, -260, 300, -260]]) { g.beginPath(); const [x1, y1] = toM(r[0], r[1]); g.moveTo(x1, y1); const [x2, y2] = toM(r[2], r[3]); g.lineTo(x2, y2); g.stroke(); }
  for (const d of DISTRICTS) { const [x, y] = toM(d.x, d.z); g.fillStyle = 'rgba(255,210,62,.16)'; g.beginPath(); g.arc(x, y, d.r / 1200 * W, 0, 7); g.fill(); g.fillStyle = '#ffd98a'; g.font = 'bold 15px Arial'; g.textAlign = 'center'; g.fillText(d.name, x, y); }
  for (const r of RAMPS) { const [x, y] = toM(r.x, r.z); g.fillStyle = r.done ? '#666' : '#ff8c3a'; g.fillText('🏁', x, y); }
  for (const j of JUGS) { if (j.taken) continue; const [x, y] = toM(j.mesh.position.x, j.mesh.position.z); g.fillText('🍶', x, y); }
  const t = G.missionTarget; if (t) { const [x1, y1] = toM(G.playerPos.x, G.playerPos.z), [x2, y2] = toM(t.x, t.z); g.strokeStyle = '#ffd23e'; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd23e'; g.font = '20px Arial'; g.fillText('⭐', x2, y2); }
  const [pxx, pyy] = toM(G.playerPos.x, G.playerPos.z); g.fillStyle = '#fff'; g.beginPath(); g.arc(pxx, pyy, 6, 0, 7); g.fill();
  document.getElementById('districtStanding').innerHTML = DISTRICTS.map(d => `${d.name}: <b style="color:#ffd98a">${d.standing + Math.floor(G.respect / 12)}%</b> standing`).join('<br>');
  document.getElementById('gpsInfo').innerHTML = t ? `GPS route plotted: <b>${Math.round(Math.hypot(t.x - G.playerPos.x, t.z - G.playerPos.z))} m</b> to objective.<br>Exports delivered at Faros Point dock: ${G.exportsDone}/10<br>Next export: ${EXPORT_CARS[G.exportsDone % 10]}` : 'No active objective.';
}
