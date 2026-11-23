// The screens that are not the street: a title that sells the season in one frame, a pause
// that doubles as the stats ledger (story, completion, exports, saves), the Armería's
// counter, the Motel's save book, and the flat grey morning after a death. All of them draw
// over the living world — the game behind the glass keeps its golden hour — because a menu
// over a world feels like a place, and a menu over black feels like a form.

import { EXPORT_CARS, VIEW_H, VIEW_W, WEAPONS } from './config.js';
import { SANS, SERIF, fmtMoney } from './render.js';
import { completion, rankName, readSlots } from './economy.js';

function dim(ctx, alpha = 0.45) {
  ctx.fillStyle = `rgba(8,6,4,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panelBox(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(13,10,7,0.88)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,163,61,0.6)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

export function drawTitle(G, ctx) {
  // The world turns behind the title (the caller keeps stepping it, slowly).
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, 'rgba(10,6,3,0.25)');
  grad.addColorStop(0.55, 'rgba(10,6,3,0.05)');
  grad.addColorStop(1, 'rgba(10,6,3,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  // The name of the place, big enough to be the postcard.
  ctx.fillStyle = 'rgba(10,6,3,0.45)';
  ctx.fillRect(0, 148, VIEW_W, 208);
  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(0, 148, VIEW_W, 2.4);
  ctx.fillRect(0, 354, VIEW_W, 2.4);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 26px ' + SERIF;
  ctx.fillText('U N A   T E M P O R A D A   D E   T O R M E N T A S', VIEW_W / 2, 196);
  const titleGrad = ctx.createLinearGradient(0, 210, 0, 300);
  titleGrad.addColorStop(0, '#ffe9b0');
  titleGrad.addColorStop(0.55, '#e8a33d');
  titleGrad.addColorStop(1, '#b45a1d');
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 104px ' + SERIF;
  ctx.fillText('LAGUNA BRAVA', VIEW_W / 2, 302);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = '17px ' + SANS;
  ctx.fillText('Puerto Barro · Ciénaga Verde · La Recta · Villa Brasa · Isla Tormenta · Punta Faros', VIEW_W / 2, 336);

  // The menu itself.
  const items = ['NUEVA TEMPORADA', 'CONTINUAR (autosave)', 'CÓMO SE JUEGA'];
  ctx.font = 'bold 21px ' + SANS;
  items.forEach((item, i) => {
    const y = 452 + i * 44;
    const selected = G.menuIndex === i;
    if (selected) {
      ctx.fillStyle = 'rgba(232,163,61,0.16)';
      ctx.fillRect(VIEW_W / 2 - 240, y - 27, 480, 38);
      ctx.fillStyle = '#e8a33d';
      ctx.fillText('▸', VIEW_W / 2 - 258, y);
    }
    ctx.fillStyle = selected ? '#ffe9b0' : '#cbbfa5';
    ctx.fillText(item, VIEW_W / 2, y);
  });

  if (G.menuIndex === 2) {
    panelBox(ctx, VIEW_W / 2 - 330, 600, 660, 218);
    ctx.fillStyle = '#f3e2bb';
    ctx.font = '14.5px ' + SANS;
    const lines = [
      'WASD — moverse / conducir · E — subir, bajar, hablar, comprar',
      'F o clic — disparar · 1–6 — armas · Shift — correr',
      'M — mapa completo · P — pausa y estadísticas · N — noche',
      'R — radio del coche · H — bocina',
      '',
      'Quince trabajos para Mamá Yara antes de que llegue la Tormenta.',
      'La Patrulla recuerda lo que ven los testigos. El Taller olvida.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 640 + i * 25));
  } else {
    ctx.fillStyle = 'rgba(243,226,187,0.85)';
    ctx.font = '14.5px ' + SANS;
    ctx.fillText('ENTER — elegir · ↑ ↓ — moverse por el menú', VIEW_W / 2, 640);
    ctx.fillStyle = 'rgba(243,226,187,0.6)';
    ctx.font = '13px ' + SANS;
    ctx.fillText('15 trabajos · 6 distritos · 10 coches de exportación · 15 garrafas escondidas', VIEW_W / 2, 668);
  }
  ctx.textAlign = 'left';
}

export function drawPause(G, ctx) {
  dim(ctx, 0.55);
  const p = G.player;
  panelBox(ctx, 120, 84, 1040, 780);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8a33d';
  ctx.font = 'bold 15px ' + SANS;
  ctx.fillText('PAUSA · LA TEMPORADA DE RAYO CÁRDENAS', 152, 128);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 40px ' + SERIF;
  const pct = Math.round(completion(G) * 100);
  ctx.fillText(pct + '% COMPLETE', 152, 176);
  ctx.fillStyle = '#b8a888';
  ctx.font = '15px ' + SANS;
  ctx.fillText(rankName(p.rep) + ' · ' + fmtMoney(p.cash) + ' · REP ' + Math.round(p.rep), 152, 202);

  // Story bar: fifteen notches, the filled ones gold.
  const bx = 152;
  const bw = 976;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(bx, 226, bw, 14);
  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(bx, 226, bw * (G.stats.missionsDone / 15), 14);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 14px ' + SANS;
  ctx.fillText(`STORY ${G.stats.missionsDone}/15`, bx, 262);
  ctx.fillStyle = '#b8a888';
  ctx.font = '13.5px ' + SANS;
  const nextMission = G.missions.next < 15 ? 'Siguiente: ' + ['LA PRIMERA CARGA', 'CORREO DE AIRE', 'MEDICINA PARA BRASA', 'EL PEAJE', 'COBROS EN EL MUELLE', 'AGUA DE NOCHE', 'METAL CALIENTE', 'ANTES DE LA TORMENTA', 'EL SOPLÓN', 'FUEGO EN LA CAÑA', 'OJOS DEL CÓNDOR', 'EL CONVOY DE YARA', 'LA CARRERA DEL CANAL', 'LA ÚLTIMA LANCHA', 'TORMENTA'][G.missions.next] : 'Historia completa';
  ctx.fillText(nextMission, bx + 130, 262);

  // Two ledgers: the season's numbers, and the export list.
  let y = 306;
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 16px ' + SERIF;
  ctx.fillText('EL LIBRO', bx, y);
  y += 8;
  const stats = [
    ['Tiempo en la cuenca', Math.floor(G.playSeconds / 60) + ' min'],
    ['Garrafas de ron', G.stats.jugs + '/15'],
    ['Exportaciones', G.stats.exports + '/10'],
    ['Rivales caídos', String(G.stats.rivalsDown)],
    ['Coches tomados', String(G.stats.carsStolen)],
    ['Distancia en lancha', Math.round(G.stats.boatMeters / 100) / 10 + ' km'],
    ['Distancia al volante', Math.round(G.stats.carMeters / 100) / 10 + ' km'],
  ];
  ctx.font = '14px ' + SANS;
  for (const [k, v] of stats) {
    y += 25;
    ctx.fillStyle = '#b8a888';
    ctx.fillText(k, bx, y);
    ctx.fillStyle = '#f3e2bb';
    ctx.textAlign = 'right';
    ctx.fillText(v, bx + 420, y);
    ctx.textAlign = 'left';
  }
  // Weapons owned.
  y += 40;
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 16px ' + SERIF;
  ctx.fillText('EL ARSENAL', bx, y);
  ctx.font = '13.5px ' + SANS;
  y += 6;
  for (let slot = 1; slot <= 6; slot += 1) {
    const w = WEAPONS[slot - 1];
    const owned = p.weapons[slot];
    y += 22;
    ctx.fillStyle = owned.owned ? '#f3e2bb' : 'rgba(203,191,165,0.4)';
    ctx.fillText((owned.owned ? '◆ ' : '◇ ') + w.name, bx, y);
    if (owned.owned) {
      ctx.fillStyle = '#b8a888';
      ctx.textAlign = 'right';
      ctx.fillText(w.ammo === Infinity ? '∞' : owned.ammo + ' balas', bx + 420, y);
      ctx.textAlign = 'left';
    }
  }

  // The export list, right column: the season's shopping list of other people's cars.
  const ex = 660;
  let ey = 306;
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 16px ' + SERIF;
  ctx.fillText('LISTA DE EXPORTACIÓN · PUNTA FAROS', ex, ey);
  ctx.font = '13.5px ' + SANS;
  EXPORT_CARS.forEach((name, i) => {
    ey += 25;
    const done = G.exports[i];
    ctx.fillStyle = done ? '#9fe8b0' : '#cbbfa5';
    ctx.fillText((done ? '✓ ' : '○ ') + name, ex, ey);
  });

  // Save slots along the bottom.
  ey += 44;
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 16px ' + SERIF;
  ctx.fillText('GUARDAR LA TEMPORADA', ex, ey);
  const slots = readSlots();
  ctx.font = '13px ' + SANS;
  slots.forEach((slot, i) => {
    ey += 26;
    ctx.fillStyle = '#b8a888';
    const label = slot
      ? `Hueco ${i + 1} — ${slot.stats?.missionsDone ?? 0}/15 trabajos · ${fmtMoney(slot.cash ?? 0)} · ${slot.savedAt?.slice(0, 10) ?? ''}`
      : `Hueco ${i + 1} — vacío`;
    ctx.fillText(label, ex, ey);
  });
  ctx.fillStyle = '#e8a33d';
  ctx.font = '13.5px ' + SANS;
  ctx.fillText('Pulsa 1–3 para guardar · Mayús+1–3 para cargar', ex, ey + 28);
  ctx.fillStyle = '#b8a888';
  ctx.fillText('P o ESC — volver a la laguna', 152, 836);
}

export function drawShop(G, ctx) {
  const building = G.shopOpen;
  if (!building) return;
  dim(ctx, 0.5);
  const isGuns = building.kind === 'guns';
  panelBox(ctx, VIEW_W / 2 - 330, 190, 660, isGuns ? 430 : 300);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8a33d';
  ctx.font = 'bold 14px ' + SANS;
  ctx.fillText(building.name.toUpperCase(), VIEW_W / 2 - 298, 232);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = 'bold 24px ' + SERIF;
  ctx.fillText(isGuns ? '¿Qué va a llevar?' : 'El libro de huéspedes', VIEW_W / 2 - 298, 266);
  ctx.fillStyle = '#9fe8b0';
  ctx.font = 'bold 15px ' + SANS;
  ctx.textAlign = 'right';
  ctx.fillText(fmtMoney(G.player.cash), VIEW_W / 2 + 298, 232);
  ctx.textAlign = 'left';
  if (isGuns) {
    let y = 306;
    ctx.font = '14.5px ' + SANS;
    for (let slot = 1; slot <= 6; slot += 1) {
      const w = WEAPONS[slot - 1];
      const owned = G.player.weapons[slot];
      ctx.fillStyle = '#b8a888';
      ctx.fillText(String(slot), VIEW_W / 2 - 298, y);
      ctx.fillStyle = owned.owned ? '#f3e2bb' : '#cbbfa5';
      ctx.fillText(w.name, VIEW_W / 2 - 268, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = owned.owned ? '#9fe8b0' : '#e8a33d';
      ctx.fillText(
        owned.owned
          ? (w.ammo === Infinity ? 'TUYO' : `TUYO · ${owned.ammo} balas · caja $${Math.ceil(w.price * 0.25)}`)
          : fmtMoney(w.price),
        VIEW_W / 2 + 298, y,
      );
      ctx.textAlign = 'left';
      y += 34;
    }
    ctx.fillStyle = '#b8a888';
    ctx.font = '13px ' + SANS;
    ctx.fillText('Pulsa el número para comprar · E o ESC para salir', VIEW_W / 2 - 298, y + 14);
  } else {
    const slots = readSlots();
    let y = 316;
    ctx.font = '14.5px ' + SANS;
    slots.forEach((slot, i) => {
      ctx.fillStyle = '#b8a888';
      ctx.fillText(String(i + 1), VIEW_W / 2 - 298, y);
      ctx.fillStyle = '#f3e2bb';
      ctx.fillText(slot ? `Temporada guardada — ${slot.stats?.missionsDone ?? 0}/15 trabajos · ${fmtMoney(slot.cash ?? 0)}` : 'Hueco vacío', VIEW_W / 2 - 268, y);
      y += 36;
    });
    ctx.fillStyle = '#b8a888';
    ctx.font = '13px ' + SANS;
    ctx.fillText('Pulsa el número para guardar en ese hueco · E o ESC para salir', VIEW_W / 2 - 298, y + 16);
  }
  if (G.shopLine) {
    ctx.fillStyle = '#e8a33d';
    ctx.font = 'italic 14.5px ' + SANS;
    ctx.fillText('“' + G.shopLine + '”', VIEW_W / 2 - 298, (isGuns ? 620 : 490) - 24);
  }
}

export function drawGameOver(G, ctx) {
  dim(ctx, 0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6a55';
  ctx.font = 'bold 54px ' + SERIF;
  ctx.fillText('FIN DE LA TEMPORADA', VIEW_W / 2, 380);
  ctx.fillStyle = '#f3e2bb';
  ctx.font = '17px ' + SANS;
  ctx.fillText('La Clínica Santa Brasa te cosió. La cuenta: $200 y el orgullo.', VIEW_W / 2, 424);
  ctx.fillText(`Trabajos: ${G.stats.missionsDone}/15 · Respeto: ${Math.round(G.player.rep)} · ${rankName(G.player.rep)}`, VIEW_W / 2, 456);
  ctx.fillStyle = '#e8a33d';
  ctx.font = 'bold 16px ' + SANS;
  ctx.fillText('ENTER — despertar en la Clínica', VIEW_W / 2, 510);
  ctx.textAlign = 'left';
}
