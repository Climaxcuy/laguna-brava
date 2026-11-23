// The basin in miniature, twice over. The round minimap rides the HUD's bottom-left corner:
// a 1500-unit window of the baked world map, turning blips — the player, the Patrulla, the
// gold objective — over it, with the district's name underneath so a screenshot always says
// where it is. The full map (M) is the same baked map grown large: every district labelled,
// every shop a glyph, the GPS thread drawn from the player to the job, and the story's
// numbers down the side.

import { DISTRICTS, SHOP_KINDS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';
import { SANS, SERIF, fmtMoney } from './render.js';
import { completion, rankName } from './economy.js';
import { clamp, dist } from './rng.js';

const MAP_R = 92;               // minimap radius, px
const MAP_SPAN = 1500;          // world units across the minimap window

export function drawMinimap(G, ctx, renderer) {
  const cx = MAP_R + 22;
  const cy = VIEW_H - MAP_R - 40;
  const p = G.player;
  ctx.save();
  // Brass ring and glass.
  ctx.beginPath();
  ctx.arc(cx, cy, MAP_R + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,11,8,0.85)';
  ctx.fill();
  ctx.strokeStyle = '#e8a33d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, MAP_R, 0, Math.PI * 2);
  ctx.clip();
  const base = renderer.minimapBase;
  if (base) {
    const scale = (MAP_SPAN / WORLD_W) * (base.width / 1);
    const imgScale = (MAP_R * 2) / MAP_SPAN; // screen px per world unit
    const bw = WORLD_W * imgScale;
    const bh = WORLD_H * imgScale;
    ctx.drawImage(base, cx - p.x * imgScale, cy - p.y * imgScale, bw, bh);
    void scale;
  }
  const imgScale = (MAP_R * 2) / MAP_SPAN;
  const toMap = (x, y) => ({ x: cx + (x - p.x) * imgScale, y: cy + (y - p.y) * imgScale });
  // Objective thread.
  const mk = G.missions.marker(G);
  if (mk) {
    const m = toMap(mk.x, mk.y);
    ctx.strokeStyle = 'rgba(232,163,61,0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(clamp(m.x, cx - MAP_R, cx + MAP_R), clamp(m.y, cy - MAP_R, cy + MAP_R));
    ctx.stroke();
    ctx.setLineDash([]);
    if (Math.abs(m.x - cx) < MAP_R && Math.abs(m.y - cy) < MAP_R) {
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 5 + Math.sin(G.time * 3.2) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Blips: blue law, white traffic, red trouble.
  for (const unit of G.police.units) {
    const m = toMap(unit.car.x, unit.car.y);
    if (Math.abs(m.x - cx) > MAP_R || Math.abs(m.y - cy) > MAP_R) continue;
    ctx.fillStyle = Math.floor(G.time * 3.4) % 2 ? '#5aa2ff' : '#ff5a4d';
    ctx.fillRect(m.x - 3, m.y - 3, 6, 6);
  }
  for (const ped of G.peds) {
    if (!ped.hostile || ped.down) continue;
    const m = toMap(ped.x, ped.y);
    if (Math.abs(m.x - cx) > MAP_R || Math.abs(m.y - cy) > MAP_R) continue;
    ctx.fillStyle = '#ff7a5c';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player: a gold arrow that points the way the nose points.
  ctx.translate(cx, cy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#f3e2bb';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5.5);
  ctx.lineTo(-6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#14100c';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  // District name under the glass, and the water's name when the map is all lagoon.
  const d = G.world.districtAt(p.x, p.y);
  ctx.fillStyle = 'rgba(14,11,8,0.78)';
  const label = d.name;
  ctx.font = 'bold 14px ' + SANS;
  const tw = ctx.measureText(label).width + 18;
  ctx.fillRect(cx - tw / 2, cy + MAP_R + 10, tw, 22);
  ctx.fillStyle = '#e8a33d';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + MAP_R + 26);
  ctx.textAlign = 'left';
}

/** The full map screen: the whole basin, its names, its errands, and the story so far. */
export function drawFullMap(G, ctx, renderer) {
  // Fully opaque: at 0.88 the paused world ghosted through the margins —
  // stray cars and HUD panels bleeding around the chart's edges (round-1 map).
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const base = renderer.minimapBase;
  const mapX = 36;
  const mapY = 70;
  const mapW = 880;
  const mapH = 660;
  ctx.fillStyle = '#0e2a2c';
  ctx.fillRect(mapX - 6, mapY - 6, mapW + 12, mapH + 12);
  if (base) ctx.drawImage(base, mapX, mapY, mapW, mapH);
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;
  const toMap = (x, y) => ({ x: mapX + x * sx, y: mapY + y * sy });

  // District names, letter-spaced like a chart.
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const m = toMap(d.x, d.y);
    ctx.font = 'bold 17px ' + SERIF;
    ctx.fillStyle = 'rgba(10,8,6,0.55)';
    const spaced = d.name.split('').join(' ');
    const tw = ctx.measureText(spaced).width + 16;
    ctx.fillRect(m.x - tw / 2, m.y - 14, tw, 24);
    ctx.fillStyle = '#f3e2bb';
    ctx.fillText(spaced, m.x, m.y + 4);
  }
  // Shop glyphs.
  ctx.font = 'bold 11px ' + SANS;
  for (const b of G.world.buildings) {
    const shop = SHOP_KINDS[b.kind];
    if (!shop) continue;
    const m = toMap(b.doorX, b.doorY);
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14100c';
    ctx.fillText(shop.label[0], m.x, m.y + 4);
  }
  // GPS thread to the objective.
  const p = G.player;
  const mk = G.missions.marker(G);
  const pm = toMap(p.x, p.y);
  if (mk) {
    const m = toMap(mk.x, mk.y);
    ctx.strokeStyle = '#e8a33d';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(pm.x, pm.y);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8 + Math.sin(G.time * 3.2) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14100c';
    ctx.font = 'bold 11px ' + SANS;
    ctx.fillText('★', m.x, m.y + 4);
  }
  // Player arrow.
  ctx.save();
  ctx.translate(pm.x, pm.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-7, -6.5);
  ctx.lineTo(-7, 6.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Cop blips.
  for (const unit of G.police.units) {
    const m = toMap(unit.car.x, unit.car.y);
    ctx.fillStyle = '#5aa2ff';
    ctx.fillRect(m.x - 3.5, m.y - 3.5, 7, 7);
  }

  // Header and the story column.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 30px ' + SERIF;
  ctx.fillText('LAGUNA BRAVA', mapX, 44);
  ctx.fillStyle = '#e8a33d';
  ctx.font = '15px ' + SANS;
  ctx.fillText('Carta de la cuenca · temporada de tormentas', mapX + 300, 44);

  const x0 = 948;
  let y = 96;
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 19px ' + SERIF;
  ctx.fillText('LA TEMPORADA', x0, y);
  y += 14;
  ctx.strokeStyle = '#e8a33d';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + 280, y);
  ctx.stroke();
  y += 34;
  const pct = Math.round(completion(G) * 100);
  ctx.font = 'bold 44px ' + SERIF;
  ctx.fillStyle = '#e8a33d';
  ctx.fillText(pct + '%', x0, y);
  ctx.font = '15px ' + SANS;
  ctx.fillStyle = '#f3e2bb';
  ctx.fillText('COMPLETE', x0 + 118, y);
  y += 30;
  const rows = [
    ['STORY', `${G.stats.missionsDone}/15 jobs`],
    ['DINERO', fmtMoney(p.cash)],
    ['RESPETO', `${Math.round(p.rep)} · ${rankName(p.rep)}`],
    ['GARRAFAS', `${G.stats.jugs}/15`],
    ['EXPORTACIONES', `${G.stats.exports}/10`],
    ['DISTRITO', G.world.districtAt(p.x, p.y).short],
  ];
  for (const [k, v] of rows) {
    ctx.font = 'bold 12.5px ' + SANS;
    ctx.fillStyle = '#b8a888';
    ctx.fillText(k, x0, y);
    ctx.font = 'bold 16.5px ' + SANS;
    ctx.fillStyle = '#f3e2bb';
    ctx.fillText(v, x0, y + 21);
    y += 46;
  }
  // District checklist with the water and the field.
  y += 6;
  ctx.font = 'bold 15px ' + SERIF;
  ctx.fillStyle = '#f3e2bb';
  ctx.fillText('DISTRITOS', x0, y);
  y += 24;
  ctx.font = '13.5px ' + SANS;
  for (const d of DISTRICTS) {
    const here = G.world.districtAt(p.x, p.y).id === d.id;
    ctx.fillStyle = here ? '#e8a33d' : '#cbbfa5';
    ctx.fillText((here ? '▸ ' : '· ') + d.short, x0 + 4, y);
    y += 20;
  }
  y += 12;
  ctx.fillStyle = '#b8a888';
  ctx.font = '12.5px ' + SANS;
  ctx.fillText('M — cerrar el mapa', x0, y);
  ctx.fillText('La línea dorada es tu GPS.', x0, y + 18);
  void dist;
}
