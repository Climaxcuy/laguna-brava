// The lagoon basin itself: a 64 x 48 grid of surfaces, six districts, the buildings that give
// them names, and the props the renderer dresses them with. Generation is seeded and fixed —
// the same basin on every visit — because the screenshot scenes and the save games both assume
// Mamá Yara's house is where it was yesterday. Land is carved first (the lagoon, the bay, the
// island), then the water roads (channels), then the land roads, then the villages on top.

import {
  CELL, DISTRICTS, SHOP_KINDS, WORLD_H, WORLD_W,
  T_DEEP, T_DIRT, T_FLOOR, T_GRASS, T_MUD, T_ROAD, T_SAND, T_WALK, T_WATER,
} from './config.js';

export { SHOP_KINDS };
import { createRng, dist, distToSegment, seedFromString } from './rng.js';

export const COLS = WORLD_W / CELL;
export const ROWS = WORLD_H / CELL;

// The water roads: airboat channels dredged through the swamp and across the bay.
const CHANNELS = [
  [[1520, 3980], [2050, 3720], [2560, 3380], [3080, 3220]],           // Puerto Barro -> lagoon
  [[1780, 2380], [2250, 2620], [2620, 2920], [3080, 3100]],           // Ciénaga -> lagoon
  [[3560, 2990], [3150, 3120]],                                       // lagoon -> Isla Tormenta west dock
  [[4360, 3060], [4900, 3350], [5380, 3820]],                         // Isla Tormenta -> Punta Faros
  [[1500, 3960], [1560, 3400], [1700, 2750], [1780, 2380]],           // the village cut, Barro -> Ciénaga
];

// The land roads: polylines with a surface and a half-width. Traffic drives the paved ones.
export const ROADS = [
  { kind: T_ROAD, half: 52, pts: [[250, 620], [6150, 620]], name: 'La Recta' },
  { kind: T_ROAD, half: 40, pts: [[5150, 620], [5150, 1120]], name: 'Bajada Brasa' },
  { kind: T_ROAD, half: 40, pts: [[5150, 1240], [5280, 2100], [5480, 3000], [5600, 3760]], name: 'Camino Faros' },
  { kind: T_ROAD, half: 40, pts: [[1150, 620], [1180, 1700], [1240, 2800], [1120, 3540]], name: 'Camino del Lodo' },
  { kind: T_DIRT, half: 30, pts: [[700, 3560], [1300, 3560]], name: 'Calle Barro' },
  { kind: T_DIRT, half: 30, pts: [[880, 3560], [880, 3960]], name: 'Callejón Quintana' },
  { kind: T_DIRT, half: 30, pts: [[1240, 2800], [1420, 2300], [1500, 2080]], name: 'Vereda de la Caña' },
  { kind: T_DIRT, half: 30, pts: [[4980, 1080], [5480, 1080]], name: 'Calle Brasa' },
  { kind: T_DIRT, half: 30, pts: [[5150, 980], [5150, 1420]], name: 'Avenida Brasa' },
];

/** Shops and named buildings, hand-placed so missions and errands always know where they are. */
const NAMED_BUILDINGS = [
  // Puerto Barro
  { kind: 'house-big', name: 'Casa Quintana', district: 'puerto-barro', x: 700, y: 3820, w: 120, h: 84, roof: '#7a3b2e' },
  { kind: 'diner', name: 'Comedor La Marea', district: 'puerto-barro', x: 900, y: 3470, w: 110, h: 76, roof: '#96613a' },
  { kind: 'guns', name: 'Armería El Faro', district: 'puerto-barro', x: 1150, y: 3470, w: 104, h: 76, roof: '#4d5a52' },
  { kind: 'boatyard', name: 'Astillero Quintana', district: 'puerto-barro', x: 1130, y: 3940, w: 130, h: 80, roof: '#54606b' },
  // Ciénaga Verde
  { kind: 'still', name: 'Destilería La Caña', district: 'cienaga', x: 1330, y: 1900, w: 140, h: 96, roof: '#5d4a2f' },
  { kind: 'shack', name: 'Refugio de Lupe', district: 'cienaga', x: 1780, y: 2260, w: 84, h: 64, roof: '#687a4a' },
  // La Recta
  { kind: 'gas', name: 'Gasolinera Recta', district: 'la-recta', x: 2860, y: 470, w: 150, h: 84, roof: '#a03d2a' },
  { kind: 'motel', name: 'Motel Brasa', district: 'la-recta', x: 3900, y: 760, w: 190, h: 80, roof: '#7a5a7e' },
  // Villa Brasa
  { kind: 'garage', name: 'Taller Brasa', district: 'villa-brasa', x: 4920, y: 1010, w: 140, h: 96, roof: '#37424e' },
  { kind: 'clinic', name: 'Clínica Santa Brasa', district: 'villa-brasa', x: 5300, y: 1180, w: 120, h: 84, roof: '#b8b0a2' },
  { kind: 'cantina', name: 'Cantina El Toro', district: 'villa-brasa', x: 5080, y: 900, w: 110, h: 76, roof: '#8f5a25' },
  { kind: 'carlot', name: 'Autos Brasa', district: 'villa-brasa', x: 5400, y: 1300, w: 130, h: 96, roof: '#54606b' },
  // Isla Tormenta
  { kind: 'warehouse', name: 'Almacén Tormenta', district: 'isla-tormenta', x: 3900, y: 2840, w: 150, h: 100, roof: '#5d3a2e' },
  { kind: 'shack', name: 'Casa del Faro Viejo', district: 'isla-tormenta', x: 4150, y: 3120, w: 84, h: 64, roof: '#687a4a' },
  // Punta Faros
  { kind: 'lighthouse', name: 'Faro de Punta Faros', district: 'punta-faros', x: 5940, y: 4080, w: 54, h: 54, roof: '#c8c2b4' },
  { kind: 'dockhouse', name: 'Muelle de Exportación', district: 'punta-faros', x: 5380, y: 3940, w: 150, h: 84, roof: '#4d5a52' },
  { kind: 'boatyard', name: 'Varadero Faros', district: 'punta-faros', x: 5500, y: 3660, w: 120, h: 80, roof: '#54606b' },
  { kind: 'diner', name: 'Comedor Faros', district: 'punta-faros', x: 5700, y: 3760, w: 104, h: 72, roof: '#96613a' },
];

/* SHOP_KINDS itself lives in config.js with the other static tables; it is
   re-exported above so older imports from this module keep resolving. */

/** The fifteen rum jugs: hidden on porches, behind stills, under the lighthouse stair. */
const JUG_SPOTS = [
  [760, 3760], [1620, 2240], [1290, 1860], [2980, 560], [4020, 830],
  [5060, 960], [5520, 1420], [4060, 2760], [4300, 3180], [6010, 4020],
  [5460, 3880], [980, 4060], [2050, 1560], [3330, 700], [4720, 2650],
];

/** Airboat moorings: where a fan boat waits, nose out, ready to board. */
const MOORINGS = [
  { x: 1500, y: 3980, angle: 0.5, district: 'puerto-barro' },
  { x: 1800, y: 2400, angle: 0.9, district: 'cienaga' },
  { x: 3520, y: 3000, angle: 3.1, district: 'isla-tormenta' },
  { x: 4400, y: 3080, angle: 0.2, district: 'isla-tormenta' },
  { x: 5360, y: 3860, angle: 2.6, district: 'punta-faros' },
];

export function createWorld() {
  const rng = createRng(seedFromString('laguna-brava-basin'));
  const grid = new Uint8Array(COLS * ROWS);

  const cellIndex = (cx, cy) => cy * COLS + cx;
  function setCell(cx, cy, kind) {
    if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) grid[cellIndex(cx, cy)] = kind;
  }
  function getCell(cx, cy) {
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return T_DEEP;
    return grid[cellIndex(cx, cy)];
  }

  // 1. Grass everywhere, then the water: lagoon ellipse, the Barro bay, the island.
  grid.fill(T_GRASS);
  const lagoon = { x: 4300, y: 3200, rx: 2100, ry: 1250 };
  const bay = { x: 2450, y: 3950, rx: 1350, ry: 720 };
  const island = { x: 3950, y: 2950, rx: 430, ry: 330 };
  function ellipseNorm(x, y, e) {
    const dx = (x - e.x) / e.rx;
    const dy = (y - e.y) / e.ry;
    return dx * dx + dy * dy;
  }
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      const inLagoon = ellipseNorm(x, y, lagoon);
      const inBay = ellipseNorm(x, y, bay);
      if (inLagoon < 0.62 || inBay < 0.55) setCell(cx, cy, T_DEEP);
      else if (inLagoon < 1.0 || inBay < 1.0) setCell(cx, cy, T_WATER);
      if (ellipseNorm(x, y, island) < 1.0) setCell(cx, cy, T_GRASS);
      if (ellipseNorm(x, y, island) < 0.55) setCell(cx, cy, T_GRASS);
    }
  }
  // The island's sand rim: land cells of the island that touch water become beach.
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (ellipseNorm(x, y, island) < 1.35 && ellipseNorm(x, y, island) >= 1.0) continue;
      if (getCell(cx, cy) === T_GRASS && ellipseNorm(x, y, island) < 1.6) {
        let nearWater = false;
        for (let oy = -1; oy <= 1 && !nearWater; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const k = getCell(cx + ox, cy + oy);
            if (k === T_WATER || k === T_DEEP) nearWater = true;
          }
        }
        if (nearWater) setCell(cx, cy, T_SAND);
      }
    }
  }

  // 2. Channels: carve the water roads through swamp and shore.
  function carvePath(pts, halfWidth, kind, onlyOver) {
    for (let cy = 0; cy < ROWS; cy += 1) {
      for (let cx = 0; cx < COLS; cx += 1) {
        const x = cx * CELL + CELL / 2;
        const y = cy * CELL + CELL / 2;
        for (let s = 0; s < pts.length - 1; s += 1) {
          if (distToSegment(x, y, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]) < halfWidth) {
            const cur = getCell(cx, cy);
            if (!onlyOver || onlyOver.includes(cur)) setCell(cx, cy, kind);
            break;
          }
        }
      }
    }
  }
  for (const channel of CHANNELS) carvePath(channel, 95, T_WATER, null);

  // 3. Mud banks: any land cell beside water softens to mud; Faros shores go sandy.
  const faros = DISTRICTS.find((d) => d.id === 'punta-faros');
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const kind = getCell(cx, cy);
      if (kind === T_WATER || kind === T_DEEP) continue;
      let nearWater = false;
      for (let oy = -1; oy <= 1 && !nearWater; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const k = getCell(cx + ox, cy + oy);
          if (k === T_WATER || k === T_DEEP) nearWater = true;
        }
      }
      if (!nearWater) continue;
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (dist(x, y, faros.x, faros.y) < 620) setCell(cx, cy, T_SAND);
      else if (kind === T_GRASS) setCell(cx, cy, T_MUD);
    }
  }

  // 4. Roads over the top of everything except deep water.
  for (const road of ROADS) carvePath(road.pts, road.half, road.kind, [T_GRASS, T_MUD, T_SAND, T_DIRT, T_WATER]);

  // 5. Puerto Barro's boardwalk: the village core walks on planks above the mud.
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (x > 620 && x < 1330 && y > 3380 && y < 4120) {
        const kind = getCell(cx, cy);
        if (kind === T_GRASS || kind === T_MUD) setCell(cx, cy, T_WALK);
      }
    }
  }

  // 6. Buildings: the named ones first, then scattered houses that keep off roads and water.
  const buildings = [];
  function placeBuilding(spec) {
    const b = { ...spec, doorX: spec.x + spec.w / 2, doorY: spec.y + spec.h };
    buildings.push(b);
    const x0 = Math.floor(spec.x / CELL);
    const x1 = Math.floor((spec.x + spec.w) / CELL);
    const y0 = Math.floor(spec.y / CELL);
    const y1 = Math.floor((spec.y + spec.h) / CELL);
    for (let cy = y0; cy <= y1; cy += 1) {
      for (let cx = x0; cx <= x1; cx += 1) setCell(cx, cy, T_FLOOR);
    }
    return b;
  }
  for (const spec of NAMED_BUILDINGS) placeBuilding(spec);

  const ROOF_POOL = ['#7a4a34', '#5d6e7a', '#8a6a42', '#4d5a52', '#93503a', '#6e5a7a'];
  const HOUSE_SPOTS = [
    // [districtId, count, spread] — houses cluster near their district heart.
    ['puerto-barro', 16, 330], ['cienaga', 7, 420], ['villa-brasa', 15, 380],
    ['isla-tormenta', 4, 240], ['punta-faros', 7, 330], ['la-recta', 4, 700],
  ];
  for (const [districtId, count, spread] of HOUSE_SPOTS) {
    const d = DISTRICTS.find((dd) => dd.id === districtId);
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 40) {
      guard += 1;
      const x = d.x + rng.range(-spread, spread);
      const y = d.y + rng.range(-spread * 0.7, spread * 0.7);
      const w = rng.range(64, 104);
      const h = rng.range(52, 80);
      const kind = getCell(Math.floor((x + w / 2) / CELL), Math.floor((y + h / 2) / CELL));
      if (kind === T_WATER || kind === T_DEEP || kind === T_ROAD || kind === T_FLOOR) continue;
      let clash = false;
      for (const b of buildings) {
        if (x < b.x + b.w + 26 && x + w + 26 > b.x && y < b.y + b.h + 26 && y + h + 26 > b.y) { clash = true; break; }
      }
      if (clash) continue;
      placeBuilding({
        kind: districtId === 'cienaga' || districtId === 'puerto-barro' ? 'stilthouse' : 'house',
        name: '', district: districtId, x, y, w, h, roof: rng.pick(ROOF_POOL),
      });
      placed += 1;
    }
  }

  // 7. Props: palms on the shores, reeds in the shallows, lamps and poles along the Recta,
  //    crates and barrels at docks and the still, buoys marking the channels.
  const props = { palms: [], reeds: [], lamps: [], poles: [], crates: [], barrels: [], buoys: [], rocks: [] };
  for (let i = 0; i < 900; i += 1) {
    const x = rng.range(60, WORLD_W - 60);
    const y = rng.range(60, WORLD_H - 60);
    const kind = getCell(Math.floor(x / CELL), Math.floor(y / CELL));
    if ((kind === T_SAND || kind === T_GRASS) && rng.chance(0.6)) {
      props.palms.push({ x, y, lean: rng.range(-0.24, 0.24), size: rng.range(0.8, 1.3), phase: rng.range(0, 6.28) });
    } else if (kind === T_WATER || kind === T_MUD) {
      props.reeds.push({ x, y, h: rng.range(16, 34), phase: rng.range(0, 6.28) });
    }
  }
  for (let i = 0; i < 260; i += 1) {
    const x = rng.range(60, WORLD_W - 60);
    const y = rng.range(60, WORLD_H - 60);
    if (getCell(Math.floor(x / CELL), Math.floor(y / CELL)) === T_WATER) {
      props.reeds.push({ x, y, h: rng.range(14, 30), phase: rng.range(0, 6.28) });
    }
  }
  for (let x = 420; x < 6100; x += 210) {
    props.lamps.push({ x, y: 620 - 78 });
    props.lamps.push({ x: x + 105, y: 620 + 78 });
    if (x % 630 === 0) props.poles.push({ x, y: 620 - 120 });
  }
  const crateSpots = [[1450, 4020], [1420, 3900], [1300, 1980], [1460, 2020], [3980, 2980], [5420, 4020], [1180, 3900], [4050, 2800]];
  for (const [x, y] of crateSpots) {
    const n = rng.int(2, 5);
    for (let i = 0; i < n; i += 1) {
      props.crates.push({ x: x + rng.range(-40, 40), y: y + rng.range(-30, 30), size: rng.range(14, 22), rot: rng.range(0, 3.1) });
      if (rng.chance(0.6)) props.barrels.push({ x: x + rng.range(-55, 55), y: y + rng.range(-40, 40), colour: rng.pick(['#7a3b2e', '#2e6f6a', '#54606b']) });
    }
  }
  for (const channel of CHANNELS) {
    for (let s = 0; s < channel.length - 1; s += 1) {
      const [x1, y1] = channel[s];
      const [x2, y2] = channel[s + 1];
      const steps = Math.floor(dist(x1, y1, x2, y2) / 260);
      for (let i = 1; i < steps; i += 1) {
        const t = i / steps;
        props.buoys.push({ x: x1 + (x2 - x1) * t + 70, y: y1 + (y2 - y1) * t, phase: rng.range(0, 6.28) });
      }
    }
  }
  for (let i = 0; i < 130; i += 1) {
    const x = rng.range(200, WORLD_W - 200);
    const y = rng.range(200, WORLD_H - 200);
    if (getCell(Math.floor(x / CELL), Math.floor(y / CELL)) === T_DEEP && rng.chance(0.5)) {
      props.rocks.push({ x, y, size: rng.range(8, 26) });
    }
  }

  // Docks: plank piers reaching from the shore to each mooring.
  const docks = MOORINGS.map((m) => ({ x: m.x, y: m.y, district: m.district }));

  function terrainAt(x, y) {
    return getCell(Math.floor(x / CELL), Math.floor(y / CELL));
  }
  function isWater(x, y) {
    const k = terrainAt(x, y);
    return k === T_WATER || k === T_DEEP;
  }
  /** True when a circle of radius r at (x, y) hits a building or leaves the basin. */
  function blockedAt(x, y, r) {
    if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
    for (const b of buildings) {
      if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return true;
    }
    return false;
  }
  /** The building whose footprint holds the point, or null. */
  function buildingAt(x, y) {
    for (const b of buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }
  /** Nearest shop building of a kind within `range` of the point, or null. */
  function shopNear(x, y, range) {
    let best = null;
    let bestDist = range;
    for (const b of buildings) {
      if (!SHOP_KINDS[b.kind]) continue;
      const d = dist(x, y, b.doorX, b.doorY);
      if (d < bestDist) { bestDist = d; best = b; }
    }
    return best;
  }
  const LAGOON_LABEL = { id: 'laguna', name: 'LA LAGUNA', short: 'La Laguna', x: 4300, y: 3200, r: 0, kind: 'water' };
  const FIELD_LABEL = { id: 'campo', name: 'CAMPO ABIERTO', short: 'Campo Abierto', x: 0, y: 0, r: 0, kind: 'field' };
  function districtAt(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = dist(x, y, d.x, d.y);
      if (dd < d.r * 1.2 && dd < bestD) { bestD = dd; best = d; }
    }
    if (best) return best;
    return isWater(x, y) ? LAGOON_LABEL : FIELD_LABEL;
  }

  return {
    grid, buildings, props, docks,
    moorings: MOORINGS,
    jugs: JUG_SPOTS.map(([x, y], i) => ({ x, y, id: i, taken: false })),
    terrainAt, isWater, blockedAt, buildingAt, shopNear, districtAt,
    channels: CHANNELS,
  };
}
