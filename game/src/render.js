// Laguna Brava's eyes. The basin's terrain is baked once into offscreen chunk canvases —
// plank by plank, reed by reed — so a frame costs a handful of drawImage calls plus the
// living things on top: boats with their rooster-tails, cars, people, the Patrulla, and
// CÓNDOR-1's spotlight. Over everything sits the grade: golden hour is a warm wash and a
// vignette; night is a blue drown with headlights cut through it; the Tormenta is grey
// rain. The camera is a point and a zoom: 1 for the street, 2+ for the postcards.

import {
  CELL, T_DEEP, T_DIRT, T_FLOOR, T_GRASS, T_MUD, T_ROAD, T_SAND, T_WALK, T_WATER,
  VIEW_H, VIEW_W, WORLD_H, WORLD_W,
} from './config.js';
import { createRng, clamp, dist, seedFromString } from './rng.js';

const CHUNK = 800;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const TERRAIN_BASE = {
  [T_DEEP]: '#17454b',
  [T_WATER]: '#256a66',
  [T_MUD]: '#5d4a33',
  [T_GRASS]: '#5c7038',
  [T_SAND]: '#c9ad72',
  [T_DIRT]: '#8a6b44',
  [T_ROAD]: '#3d3d40',
  [T_WALK]: '#7d5f3d',
  [T_FLOOR]: '#6b4e30',
};

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  let chunks = null;
  let sparkles = [];
  let minimapBase = null;

  /** Bake the world's static skin: one canvas per 800x800 block of basin. */
  function buildChunks(world) {
    const rng = createRng(seedFromString('laguna-brava-skin'));
    chunks = [];
    const cols = Math.ceil(WORLD_W / CHUNK);
    const rows = Math.ceil(WORLD_H / CHUNK);
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const cv = document.createElement('canvas');
        cv.width = CHUNK;
        cv.height = CHUNK;
        const c = cv.getContext('2d');
        paintChunk(c, world, cx * CHUNK, cy * CHUNK, rng);
        chunks.push({ cv, x: cx * CHUNK, y: cy * CHUNK });
      }
    }
    // Sparkle points live on the water and shimmer per frame above the baked skin.
    sparkles = [];
    for (let i = 0; i < 1500; i += 1) {
      const x = rng.range(0, WORLD_W);
      const y = rng.range(0, WORLD_H);
      const kind = world.terrainAt(x, y);
      if (kind === T_WATER || kind === T_DEEP) {
        sparkles.push({ x, y, phase: rng.range(0, 6.28), len: rng.range(4, 11) });
      }
    }
    minimapBase = paintMinimapBase(world);
  }

  function paintChunk(c, world, ox, oy, rng) {
    // Base: one fill per terrain cell, then the detail that makes it read as a place.
    const x0 = Math.floor(ox / CELL);
    const y0 = Math.floor(oy / CELL);
    const x1 = Math.floor((ox + CHUNK) / CELL);
    const y1 = Math.floor((oy + CHUNK) / CELL);
    for (let cy = y0; cy < y1; cy += 1) {
      for (let cx = x0; cx < x1; cx += 1) {
        const kind = world.grid[cy * (WORLD_W / CELL) + cx];
        const px = cx * CELL - ox;
        const py = cy * CELL - oy;
        c.fillStyle = TERRAIN_BASE[kind];
        c.fillRect(px, py, CELL, CELL);
        paintCellDetail(c, kind, px, py, rng);
      }
    }
    // Roads get their markings after the base, aligned to the grid rows and columns.
    c.strokeStyle = 'rgba(232,220,180,0.55)';
    c.lineWidth = 3;
    c.setLineDash([26, 30]);
    for (let cy = y0; cy < y1; cy += 1) {
      for (let cx = x0; cx < x1; cx += 1) {
        if (world.grid[cy * (WORLD_W / CELL) + cx] !== T_ROAD) continue;
        const px = cx * CELL - ox;
        const py = cy * CELL - oy;
        const right = world.grid[cy * (WORLD_W / CELL) + cx + 1] === T_ROAD;
        const below = world.grid[(cy + 1) * (WORLD_W / CELL) + cx] === T_ROAD;
        c.beginPath();
        if (right) { c.moveTo(px, py + CELL / 2); c.lineTo(px + CELL, py + CELL / 2); }
        if (below) { c.moveTo(px + CELL / 2, py); c.lineTo(px + CELL / 2, py + CELL); }
        c.stroke();
      }
    }
    c.setLineDash([]);
  }

  function paintCellDetail(c, kind, px, py, rng) {
    const dots = (n, colour, sMin, sMax) => {
      c.fillStyle = colour;
      for (let i = 0; i < n; i += 1) {
        const s = rng.range(sMin, sMax);
        c.fillRect(px + rng.range(2, CELL - 4), py + rng.range(2, CELL - 4), s, s * 0.7);
      }
    };
    switch (kind) {
      case T_DEEP:
        dots(10, 'rgba(10,40,46,0.5)', 6, 16);
        dots(5, 'rgba(70,140,140,0.25)', 4, 9);
        break;
      case T_WATER:
        dots(9, 'rgba(16,70,66,0.45)', 6, 14);
        dots(7, 'rgba(140,220,205,0.20)', 3, 7);
        break;
      case T_MUD:
        dots(16, 'rgba(40,28,16,0.5)', 4, 12);
        dots(6, 'rgba(140,120,80,0.35)', 3, 8);
        break;
      case T_GRASS: {
        dots(10, 'rgba(50,66,26,0.5)', 4, 10);
        c.strokeStyle = 'rgba(122,146,74,0.8)';
        c.lineWidth = 1.6;
        for (let i = 0; i < 12; i += 1) {
          const gx = px + rng.range(4, CELL - 4);
          const gy = py + rng.range(4, CELL - 4);
          c.beginPath();
          c.moveTo(gx, gy);
          c.lineTo(gx + rng.range(-3, 3), gy - rng.range(5, 10));
          c.stroke();
        }
        break;
      }
      case T_SAND:
        dots(18, 'rgba(160,130,80,0.4)', 2, 5);
        dots(5, 'rgba(240,225,180,0.5)', 2, 4);
        break;
      case T_DIRT:
        dots(14, 'rgba(90,64,36,0.5)', 3, 9);
        dots(6, 'rgba(180,150,105,0.4)', 2, 6);
        break;
      case T_ROAD:
        dots(10, 'rgba(20,20,22,0.5)', 3, 8);
        dots(4, 'rgba(120,120,125,0.35)', 2, 5);
        break;
      case T_WALK: {
        // Planks across the cell, gaps dark, nail heads at the ends.
        c.strokeStyle = 'rgba(52,36,20,0.65)';
        c.lineWidth = 2;
        for (let y = 10; y < CELL; y += 16) {
          c.beginPath();
          c.moveTo(px, py + y);
          c.lineTo(px + CELL, py + y);
          c.stroke();
        }
        c.fillStyle = 'rgba(30,20,12,0.8)';
        for (let y = 10; y < CELL; y += 16) {
          c.fillRect(px + 6, py + y - 6, 2.5, 2.5);
          c.fillRect(px + CELL - 9, py + y - 6, 2.5, 2.5);
        }
        break;
      }
      case T_FLOOR:
        c.strokeStyle = 'rgba(40,26,14,0.5)';
        c.lineWidth = 2;
        for (let y = 12; y < CELL; y += 20) {
          c.beginPath();
          c.moveTo(px, py + y);
          c.lineTo(px + CELL, py + y);
          c.stroke();
        }
        break;
      default:
        break;
    }
  }

  function paintMinimapBase(world) {
    const scale = 0.1;
    const cv = document.createElement('canvas');
    cv.width = WORLD_W * scale;
    cv.height = WORLD_H * scale;
    const c = cv.getContext('2d');
    const cols = WORLD_W / CELL;
    for (let cy = 0; cy < WORLD_H / CELL; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        c.fillStyle = TERRAIN_BASE[world.grid[cy * cols + cx]];
        c.fillRect(cx * CELL * scale, cy * CELL * scale, CELL * scale + 1, CELL * scale + 1);
      }
    }
    return cv;
  }

  // ------------------------------------------------------------ entities

  function shadow(x, y, rx, ry) {
    ctx.fillStyle = 'rgba(10,8,4,0.30)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCar(G, car) {
    const { x, y } = car;
    const m = car.model;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    shadow(2, 4, m.l * 0.55, m.w * 0.62);
    // Wheels.
    ctx.fillStyle = '#16130f';
    const wy = m.w / 2 - 1;
    for (const [wx, wyy] of [[-m.l * 0.3, -wy], [m.l * 0.3, -wy], [-m.l * 0.3, wy], [m.l * 0.3, wy]]) {
      ctx.fillRect(wx - 7, wyy - 3.5, 14, 7);
    }
    // Body.
    ctx.fillStyle = car.wrecked ? '#3a3630' : car.colour;
    roundRect(-m.l / 2, -m.w / 2, m.l, m.w, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (car.police) {
      ctx.fillStyle = '#2e6f6a';
      ctx.fillRect(-m.l * 0.2, -m.w / 2, m.l * 0.4, m.w);
      // Light bar: the whole street knows this blink.
      const phase = Math.floor(G.time * 3.4) % 2;
      ctx.fillStyle = phase ? '#e33' : '#e8e6dd';
      ctx.fillRect(-7, -m.w / 2 + 3, 14, 6);
      ctx.fillStyle = phase ? '#e8e6dd' : '#36c';
      ctx.fillRect(-7, m.w / 2 - 9, 14, 6);
    }
    if (car.model.id === 'taxi') {
      ctx.fillStyle = '#f3e2bb';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#14100c';
      ctx.font = 'bold 8px ' + SANS;
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    if (car.model.id === 'truck') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(-m.l / 2 + 4, -m.w / 2 + 3, m.l * 0.55, m.w - 6);
      ctx.fillStyle = 'rgba(243,226,187,0.75)';
      ctx.font = 'bold 11px ' + SANS;
      ctx.textAlign = 'center';
      ctx.fillText('FRUTAS YARA', -m.l * 0.2, 4);
    }
    // Cabin and glass.
    ctx.fillStyle = 'rgba(16,22,28,0.88)';
    roundRect(-m.l * 0.16, -m.w * 0.36, m.l * 0.34, m.w * 0.72, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,200,220,0.35)';
    ctx.fillRect(m.l * 0.1, -m.w * 0.32, m.l * 0.07, m.w * 0.64);
    // Headlights.
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(m.l / 2 - 2, -m.w * 0.3, 2.6, 0, Math.PI * 2);
    ctx.arc(m.l / 2 - 2, m.w * 0.3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c22';
    ctx.fillRect(-m.l / 2, -m.w * 0.32, 3, 5);
    ctx.fillRect(-m.l / 2, m.w * 0.32 - 5, 3, 5);
    ctx.restore();
    // Wreck smoke is spawned by the upkeep, not the drawing.
    if (car.doorsOpen > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(car.angle);
      ctx.strokeStyle = car.colour;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(2, -m.w / 2);
      ctx.lineTo(-8, -m.w / 2 - 16);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBoat(G, boat) {
    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle);
    shadow(2, 5, 30, 13);
    // Hull: a flat fan-boat sled, olive and scarred.
    ctx.fillStyle = boat.hull <= 0 ? '#33302a' : '#4d5a3a';
    roundRect(-26, -13, 52, 26, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#6e7a4e';
    roundRect(-22, -10, 30, 20, 4);
    ctx.fill();
    // Bench and driver.
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-6, -10, 6, 20);
    if (boat.driver) {
      ctx.fillStyle = boat.driver === 'player' ? '#c8432b' : '#3a3f45';
      ctx.beginPath();
      ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a06a42';
      ctx.beginPath();
      ctx.arc(4, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The fan: cage ring, spokes, and a blur disc that spins with the throttle.
    ctx.strokeStyle = '#22201c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-19, 0, 12.5, 0, Math.PI * 2);
    ctx.stroke();
    const spin = G.time * (6 + boat.fanSpin * 40);
    ctx.strokeStyle = 'rgba(220,220,210,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const a = spin + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(-19, 0);
      ctx.lineTo(-19 + Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPed(G, ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.down) {
      ctx.rotate(ped.phase);
      ctx.fillStyle = ped.shirt;
      roundRect(-11, -4.5, 22, 9, 4);
      ctx.fill();
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(13, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    shadow(0, 3, 8, 4.5);
    const walk = ped.speed > 4 ? Math.sin(G.time * 11 + ped.phase) * 3.4 : 0;
    ctx.rotate(ped.angle);
    // Legs.
    ctx.strokeStyle = '#2c2620';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-3 + walk, 4.5);
    ctx.moveTo(0, 0);
    ctx.lineTo(-3 - walk, -4.5);
    ctx.stroke();
    // Body and head.
    ctx.fillStyle = ped.shirt;
    roundRect(-6, -6, 13, 12, 5);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(4.5, 0, 4.6, 0, Math.PI * 2);
    ctx.fill();
    // A gun in hand changes a silhouette completely.
    if (ped.armed && (ped.state === 'fight' || ped.hostile)) {
      ctx.strokeStyle = '#1c1a17';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(5, 3);
      ctx.lineTo(15, 3.6);
      ctx.stroke();
    }
    ctx.restore();
    if (ped.state === 'cower') {
      ctx.fillStyle = '#f3e2bb';
      ctx.font = 'bold 13px ' + SANS;
      ctx.textAlign = 'center';
      ctx.fillText('¡!', ped.x, ped.y - 14);
    }
  }

  function drawPlayer(G) {
    const p = G.player;
    if (p.mode !== 'foot') return;
    ctx.save();
    ctx.translate(p.x, p.y);
    shadow(0, 3, 9, 5);
    const walk = p.moving ? Math.sin(G.time * 12) * 3.6 : 0;
    ctx.rotate(p.angle);
    ctx.strokeStyle = '#26221e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-3 + walk, 5);
    ctx.moveTo(0, 0);
    ctx.lineTo(-3 - walk, -5);
    ctx.stroke();
    // Rayo: ember shirt, gold chain, dark hat — readable at any zoom.
    ctx.fillStyle = '#c8432b';
    roundRect(-6.5, -6.5, 14, 13, 5);
    ctx.fill();
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(1, -4, 2.4, 8);
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.arc(5, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#241d16';
    ctx.beginPath();
    ctx.arc(5.5, 0, 5.4, Math.PI * 0.9, Math.PI * 1.9);
    ctx.fill();
    if (p.weaponSlot >= 3) {
      ctx.strokeStyle = '#1c1a17';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(6, 3);
      ctx.lineTo(17, 3.4);
      ctx.stroke();
    }
    ctx.restore();
    if (p.hurtT > 0) {
      ctx.fillStyle = `rgba(200,40,30,${0.25 * (p.hurtT / 0.35)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHeli(G) {
    const h = G.police.heli;
    if (!h) return;
    // Spotlight first, under the machine: a breathing cone of white.
    if (h.spot) {
      const grad = ctx.createRadialGradient(h.x, h.y, 10, h.x, h.y, 190);
      grad.addColorStop(0, 'rgba(255,246,200,0.30)');
      grad.addColorStop(1, 'rgba(255,246,200,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 190, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(h.x, h.y + 26); // the shadow rides below the machine
    // Kept small and faint: at chase zoom the original 34×13 / 0.35 ellipse
    // rendered as a ~480px dark stain across the road (round-4 capture).
    ctx.fillStyle = 'rgba(8,8,6,0.17)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 27, 10.5, h.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle);
    ctx.fillStyle = '#e9e6dd';
    roundRect(-26, -10, 52, 20, 9);
    ctx.fill();
    ctx.fillStyle = '#2e6f6a';
    ctx.fillRect(-26, -10, 20, 20);
    ctx.fillStyle = 'rgba(16,22,28,0.9)';
    roundRect(8, -7, 14, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#d8d4c8';
    ctx.fillRect(-58, -3, 34, 6);
    ctx.fillRect(-60, -10, 5, 20);
    // Rotor: two blurred blades and a hub.
    ctx.strokeStyle = 'rgba(30,30,30,0.75)';
    ctx.lineWidth = 3.4;
    const ra = h.rotor;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ra) * -46, Math.sin(ra) * -46 * 0.3);
    ctx.lineTo(Math.cos(ra) * 46, Math.sin(ra) * 46 * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e2bb';
    // Screen-sized label: at chase zoom the world-sized 8px original rendered
    // ~56px tall and shouted across the whole frame (round-3 capture).
    ctx.font = 'bold ' + (11 / (G.camera.zoom || 1)) + 'px ' + SANS;
    ctx.textAlign = 'center';
    ctx.fillText('CÓNDOR-1', -14, 3);
    ctx.restore();
  }

  function drawBuilding(G, b) {
    ctx.save();
    shadow(b.x + b.w / 2 + 5, b.y + b.h + 5, b.w * 0.55, b.h * 0.4);
    // Stilts for the swamp and village houses: the water comes up, the house stays dry.
    if (b.kind === 'stilthouse' || b.kind === 'shack' || b.kind === 'house-big') {
      ctx.strokeStyle = '#4a3826';
      ctx.lineWidth = 4;
      for (const [sx, sy] of [[b.x + 8, b.y + 8], [b.x + b.w - 8, b.y + 8], [b.x + 8, b.y + b.h - 8], [b.x + b.w - 8, b.y + b.h - 8]]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 3, sy + 10);
        ctx.stroke();
      }
    }
    // Walls, then a roof with a ridge and shingle lines.
    ctx.fillStyle = '#8a7358';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.4;
    for (let y = b.y + 8; y < b.y + b.h; y += 11) {
      ctx.beginPath();
      ctx.moveTo(b.x - 2, y);
      ctx.lineTo(b.x + b.w + 2, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,200,0.20)';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.h / 2);
    ctx.lineTo(b.x + b.w, b.y + b.h / 2);
    ctx.stroke();
    // Door and a lit window or two: somebody is always home.
    ctx.fillStyle = '#2c2016';
    ctx.fillRect(b.doorX - 7, b.doorY - 14, 14, 14);
    ctx.fillStyle = G.night ? 'rgba(255,196,90,0.95)' : 'rgba(255,226,150,0.55)';
    ctx.fillRect(b.x + b.w * 0.22, b.y + b.h * 0.3, 9, 8);
    if (b.w > 90) ctx.fillRect(b.x + b.w * 0.66, b.y + b.h * 0.55, 9, 8);
    ctx.restore();
    // Signs for the named places, small and painted by hand.
    if (b.name) {
      ctx.fillStyle = 'rgba(16,12,8,0.72)';
      const label = b.name.toUpperCase();
      ctx.font = 'bold 10.5px ' + SANS;
      const tw = ctx.measureText(label).width + 14;
      ctx.fillRect(b.x + b.w / 2 - tw / 2, b.y - 24, tw, 16);
      ctx.fillStyle = '#f3e2bb';
      ctx.textAlign = 'center';
      ctx.fillText(label, b.x + b.w / 2, b.y - 12);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ------------------------------------------------------------ frame

  function draw(G) {
    const cam = G.camera;
    const world = G.world;
    if (!chunks) buildChunks(world);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#17454b';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const shakeX = G.rng.range(-1, 1) * cam.shake;
    const shakeY = G.rng.range(-1, 1) * cam.shake;
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, VIEW_W / 2 - cam.x * cam.zoom + shakeX, VIEW_H / 2 - cam.y * cam.zoom + shakeY);
    const vw = VIEW_W / cam.zoom;
    const vh = VIEW_H / cam.zoom;
    const vx0 = cam.x - vw / 2 - 60;
    const vy0 = cam.y - vh / 2 - 60;
    const vx1 = cam.x + vw / 2 + 60;
    const vy1 = cam.y + vh / 2 + 60;

    for (const ch of chunks) {
      if (ch.x + CHUNK < vx0 || ch.y + CHUNK < vy0 || ch.x > vx1 || ch.y > vy1) continue;
      ctx.drawImage(ch.cv, ch.x, ch.y);
    }
    // Water sparkle, alive above the baked skin.
    ctx.fillStyle = 'rgba(220,250,240,0.5)';
    for (const s of sparkles) {
      if (s.x < vx0 || s.x > vx1 || s.y < vy0 || s.y > vy1) continue;
      const a = 0.5 + 0.5 * Math.sin(G.time * 1.7 + s.phase);
      if (a < 0.55) continue;
      ctx.globalAlpha = (a - 0.55) * 1.4;
      ctx.fillRect(s.x, s.y, s.len, 1.8);
    }
    ctx.globalAlpha = 1;

    drawProps(G, vx0, vy0, vx1, vy1, 'under');
    // Docks: plank piers at the moorings.
    for (const d of world.docks) {
      ctx.fillStyle = '#6e5133';
      ctx.fillRect(d.x - 60, d.y - 10, 120, 20);
      ctx.strokeStyle = 'rgba(40,26,14,0.6)';
      ctx.lineWidth = 1.6;
      for (let x = d.x - 54; x < d.x + 60; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, d.y - 10);
        ctx.lineTo(x, d.y + 10);
        ctx.stroke();
      }
    }
    drawPickups(G);
    for (const boat of G.boats) drawBoat(G, boat);
    for (const car of G.cars) {
      if (car.x < vx0 - 80 || car.x > vx1 + 80 || car.y < vy0 - 80 || car.y > vy1 + 80) continue;
      drawCar(G, car);
    }
    for (const ped of G.peds) {
      if (ped.x < vx0 - 40 || ped.x > vx1 + 40 || ped.y < vy0 - 40 || ped.y > vy1 + 40) continue;
      drawPed(G, ped);
    }
    drawPlayer(G);
    drawProjectiles(G);
    drawParticles(G);
    drawProps(G, vx0, vy0, vx1, vy1, 'over');
    drawHeli(G);
    // Mission ring: a breathing gold circle on the current objective.
    const mk = G.missions.marker(G);
    if (mk && G.screen === 'play') {
      const d = dist(cam.x, cam.y, mk.x, mk.y);
      if (d < Math.max(vw, vh)) {
        const pulse = 30 + Math.sin(G.time * 3.2) * 6;
        ctx.strokeStyle = 'rgba(232,163,61,0.9)';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(mk.x, mk.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(232,163,61,0.16)';
        ctx.beginPath();
        ctx.arc(mk.x, mk.y, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawFloaters(G);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawGrade(G);
  }

  function drawProps(G, vx0, vy0, vx1, vy1, layer) {
    const props = G.world.props;
    if (layer === 'under') {
      // Reeds, crates, barrels, rocks, buoys: the ground's furniture.
      ctx.strokeStyle = 'rgba(84,110,52,0.9)';
      ctx.lineWidth = 2;
      for (const r of props.reeds) {
        if (r.x < vx0 || r.x > vx1 || r.y < vy0 || r.y > vy1) continue;
        const sway = Math.sin(G.time * 1.3 + r.phase) * 2.4;
        ctx.beginPath();
        for (let b = -2; b <= 2; b += 1) {
          ctx.moveTo(r.x + b * 3, r.y);
          ctx.lineTo(r.x + b * 3 + sway, r.y - r.h);
        }
        ctx.stroke();
      }
      for (const b of props.buoys) {
        if (b.x < vx0 || b.x > vx1 || b.y < vy0 || b.y > vy1) continue;
        const bob = Math.sin(G.time * 2 + b.phase) * 2;
        ctx.fillStyle = '#c8432b';
        ctx.beginPath();
        ctx.arc(b.x, b.y + bob, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f3e2bb';
        ctx.fillRect(b.x - 5.5, b.y + bob - 1.6, 11, 3.2);
      }
      for (const r of props.rocks) {
        if (r.x < vx0 || r.x > vx1 || r.y < vy0 || r.y > vy1) continue;
        ctx.fillStyle = '#4c4a44';
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(230,240,235,0.5)';
        ctx.beginPath();
        ctx.arc(r.x - r.size * 0.3, r.y - r.size * 0.3, r.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const cr of props.crates) {
        if (cr.x < vx0 || cr.x > vx1 || cr.y < vy0 || cr.y > vy1) continue;
        ctx.save();
        ctx.translate(cr.x, cr.y);
        ctx.rotate(cr.rot);
        ctx.fillStyle = '#8a6b44';
        ctx.fillRect(-cr.size / 2, -cr.size / 2, cr.size, cr.size);
        ctx.strokeStyle = 'rgba(40,26,14,0.7)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-cr.size / 2, -cr.size / 2, cr.size, cr.size);
        ctx.beginPath();
        ctx.moveTo(-cr.size / 2, -cr.size / 2);
        ctx.lineTo(cr.size / 2, cr.size / 2);
        ctx.stroke();
        ctx.restore();
      }
      for (const b of props.barrels) {
        if (b.x < vx0 || b.x > vx1 || b.y < vy0 || b.y > vy1) continue;
        ctx.fillStyle = b.colour;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.stroke();
      }
      // Buildings sit on the ground layer too — their canopies come later.
      for (const b of G.world.buildings) {
        if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
        drawBuilding(G, b);
      }
    } else {
      // Palms lean over the street; lamps wait for the night grade to glow.
      for (const p of props.palms) {
        if (p.x < vx0 - 60 || p.x > vx1 + 60 || p.y < vy0 - 60 || p.y > vy1 + 60) continue;
        ctx.strokeStyle = '#5d4630';
        ctx.lineWidth = 5 * p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(p.x + p.lean * 30, p.y - 16 * p.size, p.x + p.lean * 52, p.y - 30 * p.size);
        ctx.stroke();
        const tx = p.x + p.lean * 52;
        const ty = p.y - 30 * p.size;
        ctx.strokeStyle = 'rgba(58,94,40,0.92)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + p.phase;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(
            tx + Math.cos(a) * 15, ty + Math.sin(a) * 9 - 4,
            tx + Math.cos(a) * 27, ty + Math.sin(a) * 15 + 5,
          );
          ctx.stroke();
        }
      }
      if (G.night) {
        for (const l of props.lamps) {
          if (l.x < vx0 || l.x > vx1 || l.y < vy0 || l.y > vy1) continue;
          const grad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 64);
          grad.addColorStop(0, 'rgba(255,205,110,0.5)');
          grad.addColorStop(1, 'rgba(255,205,110,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(l.x, l.y, 64, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd98a';
          ctx.beginPath();
          ctx.arc(l.x, l.y, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPickups(G) {
    for (const pk of G.pickups) {
      const bob = Math.sin(pk.bobPhase ?? 0) * 3;
      ctx.save();
      ctx.translate(pk.x, pk.y + bob);
      if (pk.kind === 'jug') {
        ctx.fillStyle = '#a03d2a';
        roundRect(-6, -10, 12, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#e8a33d';
        ctx.fillRect(-3, -14, 6, 5);
      } else if (pk.kind === 'cash') {
        ctx.fillStyle = '#3f7a3a';
        ctx.fillRect(-10, -6, 20, 12);
        ctx.fillStyle = '#9fe8b0';
        ctx.font = 'bold 10px ' + SANS;
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 3.5);
      } else if (pk.kind === 'debt') {
        ctx.fillStyle = '#f3e2bb';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8f2318';
        ctx.font = 'bold 11px ' + SANS;
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      } else {
        ctx.fillStyle = '#8a6b44';
        ctx.fillRect(-11, -9, 22, 18);
        ctx.strokeStyle = '#e8a33d';
        ctx.lineWidth = 2;
        ctx.strokeRect(-11, -9, 22, 18);
        ctx.fillStyle = '#e8a33d';
        ctx.fillRect(-11, -2, 22, 3);
      }
      ctx.restore();
      // A soft ring so the eye finds them in a busy frame.
      ctx.strokeStyle = 'rgba(243,226,187,0.5)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 15 + Math.sin(G.time * 3 + (pk.bobPhase ?? 0)) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawProjectiles(G) {
    ctx.strokeStyle = 'rgba(255,230,160,0.85)';
    ctx.lineWidth = 2;
    for (const pr of G.combat.projectiles) {
      ctx.beginPath();
      ctx.moveTo(pr.x - pr.vx * 0.016, pr.y - pr.vy * 0.016);
      ctx.lineTo(pr.x, pr.y);
      ctx.stroke();
    }
  }

  function drawParticles(G) {
    for (const pt of G.particles) {
      const t = pt.life / pt.maxLife;
      ctx.globalAlpha = Math.max(0, 1 - t) * (pt.kind === 'smoke' || pt.kind === 'spray' ? 0.8 : 1);
      ctx.fillStyle = pt.colour;
      const s = pt.size * (pt.kind === 'smoke' ? 1 + t * 2 : 1);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(G) {
    // Floater text is screen furniture, not scenery: it is sized in screen pixels
    // whatever the camera zoom, so a staged close-up cannot inflate a damage
    // number into a banner (round-1 captures: size-15 text at zoom 3.4 rendered
    // 51 px tall and swallowed the frame it was annotating).
    const z = G.camera.zoom || 1;
    ctx.textAlign = 'center';
    for (const f of G.floaters) {
      const t = f.life / f.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.font = 'bold ' + ((f.size ?? 15) / z) + 'px ' + SANS;
      ctx.fillStyle = f.colour;
      ctx.fillText(f.text, f.x, f.y - ((1 - t) * 26) / z);
    }
    ctx.globalAlpha = 1;
  }

  /** The grade: dusk warmth, night drown, storm grey, and always a vignette. */
  function drawGrade(G) {
    const hour = G.dayHour;
    let warm = 0;
    if (hour > 16 && hour < 20) warm = 0.16;
    else if (hour >= 20 || hour < 5.5) warm = 0;
    else warm = 0.06;
    if (warm > 0) {
      const grad = ctx.createLinearGradient(0, 0, VIEW_W * 0.3, VIEW_H);
      grad.addColorStop(0, `rgba(255,138,42,${warm})`);
      grad.addColorStop(1, `rgba(64,16,64,${warm * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (G.night) {
      ctx.fillStyle = 'rgba(8,14,34,0.42)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (G.weather.storm > 0) {
      ctx.fillStyle = `rgba(52,58,66,${0.34 * G.weather.storm})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // Rain: short slanted streaks cycling through the frame.
      ctx.strokeStyle = `rgba(200,220,235,${0.4 * G.weather.storm})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 90; i += 1) {
        const rx = ((i * 173 + G.time * 620) % (VIEW_W + 80)) - 40;
        const ry = ((i * 269 + G.time * 900) % (VIEW_H + 60)) - 30;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 7, ry + 17);
      }
      ctx.stroke();
    }
    const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.86);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(6,4,2,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  return {
    draw,
    buildChunks,
    get minimapBase() { return minimapBase; },
    ctx,
    canvas,
  };
}

export { SERIF, SANS };
export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
