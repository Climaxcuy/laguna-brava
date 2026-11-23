// The glass between the player and the lagoon: four panels that must read at a glance and
// photograph like a real game's. Top-left, the job: which of the fifteen, what stage, how
// far along, what next, how far away. Top-right, the law: stars, the hunt's state, and the
// dispatch net's units with live distances — the panel that proves the police are a system,
// not a sprite. Bottom, the hands: the weapon strip, and the vehicle's own panel when the
// player sits in one. Centre-screen, the banner the season is remembered by.

import { VIEW_H, VIEW_W, WEAPONS } from './config.js';
import { SANS, SERIF, fmtMoney } from './render.js';
import { drawMinimap } from './minimap.js';
import { dist } from './rng.js';

function panel(ctx, x, y, w, h, alpha = 0.78) {
  ctx.fillStyle = `rgba(13,10,7,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,163,61,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, colour, back = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  if (frac > 0) {
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w * Math.min(1, frac), h);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawMissionPanel(G, ctx) {
  const data = G.missions.hudData(G);
  const x = 18;
  const y = 16;
  const w = 342;
  panel(ctx, x, y, w, 118);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8a33d';
  ctx.font = 'bold 13px ' + SANS;
  ctx.fillText(data.job, x + 14, y + 22);
  // Distance to the marker rides the same line, right-aligned.
  const mk = G.missions.marker(G);
  if (mk) {
    const d = Math.round(dist(G.player.x, G.player.y, mk.x, mk.y));
    ctx.fillStyle = '#f3e2bb';
    ctx.font = 'bold 13px ' + SANS;
    ctx.textAlign = 'right';
    ctx.fillText(d + ' m', x + w - 14, y + 22);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 16.5px ' + SANS;
  const lines = wrapText(ctx, data.stage, w - 28).slice(0, 2);
  lines.forEach((line, i) => ctx.fillText(line, x + 14, y + 46 + i * 20));
  // Stage progress: the season's heartbeat in one gold rule.
  bar(ctx, x + 14, y + 88, w - 28, 6, data.progress, '#e8a33d');
  ctx.fillStyle = '#b8a888';
  ctx.font = '12.5px ' + SANS;
  ctx.fillText('NEXT · ' + data.next, x + 14, y + 110);
}

function starRow(ctx, x, y, stars) {
  ctx.font = '19px ' + SANS;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < Math.ceil(stars - 0.01) ? '#e8a33d' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', x + i * 21, y);
  }
}

function drawDispatchPanel(G, ctx) {
  const pol = G.police;
  if (pol.stars <= 0 && pol.units.length === 0 && !pol.heli) return;
  const w = 300;
  const x = VIEW_W - w - 18;
  const y = 16;
  const rows = pol.units.length + (pol.heli ? 1 : 0);
  const h = 86 + rows * 21 + (pol.log.length ? 20 : 0);
  panel(ctx, x, y, w, h, 0.82);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 12.5px ' + SANS;
  ctx.fillText('PATRULLA ESTATAL · CENTRAL', x + 14, y + 21);
  starRow(ctx, x + 14, y + 44, pol.stars);
  const stateColour = pol.sight === 'INSIGHT' ? '#ff6a55' : pol.sight === 'SEARCHING' ? '#e8a33d' : '#9fe8b0';
  ctx.fillStyle = stateColour;
  ctx.font = 'bold 13.5px ' + SANS;
  ctx.textAlign = 'right';
  ctx.fillText(pol.sight === 'INSIGHT' ? 'IN SIGHT' : pol.sight, x + w - 14, y + 44);
  ctx.textAlign = 'left';
  let ry = y + 68;
  ctx.font = '12.5px ' + SANS;
  for (const unit of pol.units) {
    const d = Math.round(dist(unit.car.x, unit.car.y, G.player.x, G.player.y));
    ctx.fillStyle = '#5aa2ff';
    ctx.fillText('■', x + 14, ry);
    ctx.fillStyle = '#f3e2bb';
    ctx.font = 'bold 12.5px ' + SANS;
    ctx.fillText(unit.callsign, x + 30, ry);
    ctx.font = '12.5px ' + SANS;
    ctx.fillStyle = '#b8a888';
    ctx.fillText(unit.role, x + 108, ry);
    ctx.fillStyle = '#f3e2bb';
    ctx.textAlign = 'right';
    ctx.fillText(d + ' m', x + w - 14, ry);
    ctx.textAlign = 'left';
    ry += 21;
  }
  if (pol.heli) {
    const d = Math.round(dist(pol.heli.x, pol.heli.y, G.player.x, G.player.y));
    ctx.fillStyle = '#5aa2ff';
    ctx.fillText('▲', x + 14, ry);
    ctx.fillStyle = '#f3e2bb';
    ctx.font = 'bold 12.5px ' + SANS;
    ctx.fillText('CÓNDOR-1', x + 30, ry);
    ctx.font = '12.5px ' + SANS;
    ctx.fillStyle = '#b8a888';
    ctx.fillText('AIR · SPOTLIGHT', x + 108, ry);
    ctx.fillStyle = '#f3e2bb';
    ctx.textAlign = 'right';
    ctx.fillText(d + ' m', x + w - 14, ry);
    ctx.textAlign = 'left';
    ry += 21;
  }
  if (pol.log.length) {
    ctx.fillStyle = 'rgba(232,163,61,0.85)';
    ctx.font = 'italic 11.5px ' + SANS;
    const last = pol.log[pol.log.length - 1];
    ctx.fillText('“' + last + '”', x + 14, ry + 12);
  }
}

function drawWeaponStrip(G, ctx) {
  const p = G.player;
  const slotW = 74;
  const slotH = 54;
  const totalW = slotW * 6 + 5 * 6;
  const x = (VIEW_W - totalW) / 2 - 120;
  const y = VIEW_H - slotH - 16;
  for (let slot = 1; slot <= 6; slot += 1) {
    const weapon = WEAPONS[slot - 1];
    const owned = p.weapons[slot];
    const sx = x + (slot - 1) * (slotW + 6);
    const current = p.weaponSlot === slot;
    ctx.fillStyle = current ? 'rgba(64,42,14,0.9)' : 'rgba(13,10,7,0.72)';
    ctx.beginPath();
    ctx.roundRect(sx, y, slotW, slotH, 7);
    ctx.fill();
    ctx.strokeStyle = current ? '#e8a33d' : 'rgba(232,163,61,0.3)';
    ctx.lineWidth = current ? 2.2 : 1.2;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = owned.owned ? '#b8a888' : 'rgba(184,168,136,0.4)';
    ctx.font = 'bold 10.5px ' + SANS;
    ctx.fillText(String(slot), sx + 7, y + 15);
    ctx.fillStyle = owned.owned ? '#f3e2bb' : 'rgba(243,226,187,0.35)';
    ctx.font = 'bold 10px ' + SANS;
    const short = weapon.name.replace('.38 ', '').replace(' ARTESANAL', '').replace('CARABINA ', '');
    ctx.fillText(short, sx + 7, y + 30);
    ctx.fillStyle = owned.owned ? '#e8a33d' : 'rgba(232,163,61,0.35)';
    ctx.font = 'bold 12px ' + SANS;
    ctx.fillText(!owned.owned ? '—' : weapon.ammo === Infinity ? '∞' : String(owned.ammo), sx + 7, y + 47);
  }
  ctx.textAlign = 'left';
}

function drawStatusCluster(G, ctx) {
  const p = G.player;
  // Cash, respect and the clock ride top-centre: small, gold, always true.
  const cx = VIEW_W / 2 + 190;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(13,10,7,0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - 216, 16, 216, 56, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,163,61,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#9fe8b0';
  ctx.font = 'bold 19px ' + SANS;
  ctx.fillText(fmtMoney(p.cash), cx - 14, 40);
  ctx.fillStyle = '#b8a888';
  ctx.font = '11.5px ' + SANS;
  const hh = Math.floor(G.dayHour);
  const mm = Math.floor((G.dayHour - hh) * 60);
  ctx.fillText(`REP ${Math.round(p.rep)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, cx - 14, 61);
  ctx.textAlign = 'left';
}

function drawVehiclePanel(G, ctx) {
  const p = G.player;
  const w = 252;
  const x = VIEW_W - w - 18;
  const y = VIEW_H - 118;
  panel(ctx, x, y, w, 102);
  ctx.textAlign = 'left';
  if (p.mode === 'car' && p.car) {
    const car = p.car;
    ctx.fillStyle = '#e8a33d';
    ctx.font = 'bold 13px ' + SANS;
    ctx.fillText('VEHÍCULO', x + 14, y + 22);
    ctx.fillStyle = '#f3e2bb';
    ctx.font = 'bold 15px ' + SANS;
    const name = car.name.length > 26 ? car.name.slice(0, 25) + '…' : car.name;
    ctx.fillText(name, x + 14, y + 43);
    const kmh = Math.round(Math.abs(car.speed) * 0.62);
    ctx.font = 'bold 21px ' + SERIF;
    ctx.fillStyle = '#f3e2bb';
    ctx.fillText(kmh + '', x + 14, y + 72);
    ctx.font = '12px ' + SANS;
    ctx.fillStyle = '#b8a888';
    ctx.fillText('km/h', x + 58, y + 72);
    ctx.fillStyle = '#b8a888';
    ctx.fillText('CHAPA', x + 118, y + 60);
    bar(ctx, x + 118, y + 66, 118, 9, Math.max(0, car.health) / 100, car.health > 35 ? '#9fe8b0' : '#ff6a55');
  } else if (p.mode === 'boat' && p.boat) {
    const boat = p.boat;
    const speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
    ctx.fillStyle = '#e8a33d';
    ctx.font = 'bold 13px ' + SANS;
    ctx.fillText('LANCHA DE AIRE', x + 14, y + 22);
    ctx.fillStyle = '#f3e2bb';
    ctx.font = 'bold 15px ' + SANS;
    ctx.fillText(boat.name, x + 14, y + 43);
    ctx.font = 'bold 21px ' + SERIF;
    ctx.fillText(Math.round(speed * 0.62) + '', x + 14, y + 72);
    ctx.font = '12px ' + SANS;
    ctx.fillStyle = '#b8a888';
    ctx.fillText('km/h', x + 58, y + 72);
    ctx.fillText('CASCO', x + 118, y + 60);
    bar(ctx, x + 118, y + 66, 118, 9, Math.max(0, boat.hull) / 100, boat.hull > 35 ? '#9fe8b0' : '#ff6a55');
  } else {
    ctx.fillStyle = '#e8a33d';
    ctx.font = 'bold 13px ' + SANS;
    ctx.fillText('A PIE · ' + (WEAPONS[p.weaponSlot - 1]?.name ?? ''), x + 14, y + 22);
    ctx.fillStyle = '#b8a888';
    ctx.font = '12.5px ' + SANS;
    ctx.fillText('SALUD', x + 14, y + 47);
    bar(ctx, x + 14, y + 53, w - 28, 10, Math.max(0, p.hp) / 100, p.hp > 30 ? '#9fe8b0' : '#ff6a55');
    ctx.fillText('CHALECO', x + 14, y + 76);
    bar(ctx, x + 14, y + 82, w - 28, 8, Math.max(0, p.armour) / 100, '#5aa2ff');
  }
}

function drawBanner(G, ctx) {
  const b = G.banner;
  if (!b) return;
  const t = b.t / b.dur;
  const alpha = t < 0.12 ? t / 0.12 : t > 0.82 ? (1 - t) / 0.18 : 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const passed = b.title.includes('PASSED');
  const failed = b.title.includes('FAILED');
  const cy = passed ? 300 : 168;
  const parts = b.line.split(' · ');
  // A PASSED banner is a receipt: the job name alone is not the receipt — the
  // money and the rep are. Passed lines therefore get a second row and a
  // taller band instead of dropping everything after the first ' · '.
  const twoRows = passed && parts.length > 1;
  const bandTop = twoRows ? cy - 80 : cy - 74;
  const bandBot = twoRows ? cy + 84 : cy + 72;
  if (passed || failed) {
    ctx.fillStyle = 'rgba(10,8,5,0.55)';
    ctx.fillRect(0, bandTop, VIEW_W, bandBot - bandTop);
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(0, bandTop, VIEW_W, 2.4);
    ctx.fillRect(0, bandBot - 2.4, VIEW_W, 2.4);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = failed ? '#ff6a55' : '#e8a33d';
  ctx.font = 'bold ' + (passed || failed ? 55 : 30) + 'px ' + SERIF;
  const spaced = b.title.split('').join(' ');
  ctx.fillText(spaced, VIEW_W / 2, cy + (passed || failed ? 6 : 0));
  ctx.fillStyle = '#f3e2bb';
  ctx.font = (passed || failed ? 'bold 19px ' : '15.5px ') + SANS;
  if (twoRows) {
    ctx.fillText(parts[0], VIEW_W / 2, cy + 42);
    ctx.fillStyle = '#9fe8b0';
    ctx.fillText(parts.slice(1).join(' · '), VIEW_W / 2, cy + 68);
  } else {
    ctx.fillText(b.line, VIEW_W / 2, cy + (passed || failed ? 44 : 30));
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawPrompt(G, ctx) {
  if (!G.prompt) return;
  ctx.font = 'bold 15.5px ' + SANS;
  const text = G.prompt;
  const tw = ctx.measureText(text).width + 34;
  const x = (VIEW_W - tw) / 2;
  const y = VIEW_H - 150;
  ctx.fillStyle = 'rgba(13,10,7,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, tw, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#e8a33d';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#f3e2bb';
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y + 22);
  ctx.textAlign = 'left';
}

export function drawHud(G, ctx, renderer) {
  drawMissionPanel(G, ctx);
  drawDispatchPanel(G, ctx);
  drawStatusCluster(G, ctx);
  drawMinimap(G, ctx, renderer);
  drawWeaponStrip(G, ctx);
  drawVehiclePanel(G, ctx);
  drawPrompt(G, ctx);
  drawBanner(G, ctx);
  // Hurt vignette: the frame bleeds before the bar empties.
  const p = G.player;
  if (p.hurtT > 0 || p.hp < 30) {
    const a = Math.max(p.hurtT / 0.35, p.hp < 30 ? 0.35 + 0.15 * Math.sin(G.time * 5) : 0) * 0.4;
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.36, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.8);
    grad.addColorStop(0, 'rgba(160,20,10,0)');
    grad.addColorStop(1, `rgba(160,20,10,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
