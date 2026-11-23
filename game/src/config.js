// Laguna Brava — the fixed numbers every other module reads. World units are "steps": the
// lagoon basin is 6400 x 4800 of them, a car is about 46 long, a person 9 wide. The canvas is
// 1280 x 960 and the camera shows VIEW_W / zoom world units across, so zoom 1 is the honest
// street view and the screenshot scenes push in to about 2 for their close-ups.

export const VIEW_W = 1280;
export const VIEW_H = 960;
export const STEP = 1 / 60;

export const WORLD_W = 6400;
export const WORLD_H = 4800;

/** Terrain cell size: the world is a 64 x 48 grid of these, each cell one surface kind. */
export const CELL = 100;

// Surface kinds, stored as small integers in the world grid.
export const T_DEEP = 0;    // lagoon deep water: boats only, nobody wades
export const T_WATER = 1;   // channel and shore water: boats, wading at the edge
export const T_MUD = 2;     // bank mud: slow on foot, airboats beach and grip here
export const T_GRASS = 3;   // wet grassland: the default land
export const T_SAND = 4;    // the Faros point beaches
export const T_DIRT = 5;    // dirt tracks between settlements
export const T_ROAD = 6;    // paved road and the Recta highway
export const T_WALK = 7;    // stilt-village boardwalk: foot traffic and handcarts
export const T_FLOOR = 8;   // shop floorboards, only ever under a roof footprint

/** How the surfaces read to feet, wheels and hulls: a grip multiplier per mover kind. */
export const SURFACE = {
  [T_DEEP]: { name: 'deep water', foot: 0, car: 0, boat: 1.0 },
  [T_WATER]: { name: 'water', foot: 0.25, car: 0, boat: 1.0 },
  [T_MUD]: { name: 'mud', foot: 0.45, car: 0.35, boat: 0.8 },
  [T_GRASS]: { name: 'grass', foot: 0.9, car: 0.55, boat: 0 },
  [T_SAND]: { name: 'sand', foot: 0.75, car: 0.45, boat: 0.25 },
  [T_DIRT]: { name: 'dirt track', foot: 1.0, car: 0.8, boat: 0 },
  [T_ROAD]: { name: 'paved road', foot: 1.0, car: 1.0, boat: 0 },
  [T_WALK]: { name: 'boardwalk', foot: 1.0, car: 0.3, boat: 0 },
  [T_FLOOR]: { name: 'floorboards', foot: 1.0, car: 0, boat: 0 },
};

// The six districts. Centres are where the map label sits and where the district's shops,
// parked cars and porch crowds gather; radius is the "you are in" feel, not a hard border.
export const DISTRICTS = [
  { id: 'puerto-barro', name: 'PUERTO BARRO', short: 'Puerto Barro', x: 1050, y: 3750, r: 780, kind: 'village' },
  { id: 'cienaga', name: 'CIÉNAGA VERDE', short: 'Ciénaga Verde', x: 1500, y: 2050, r: 950, kind: 'swamp' },
  { id: 'la-recta', name: 'LA RECTA', short: 'La Recta', x: 3300, y: 620, r: 1050, kind: 'highway' },
  { id: 'villa-brasa', name: 'VILLA BRASA', short: 'Villa Brasa', x: 5150, y: 1150, r: 820, kind: 'town' },
  { id: 'isla-tormenta', name: 'ISLA TORMENTA', short: 'Isla Tormenta', x: 3950, y: 2950, r: 560, kind: 'island' },
  { id: 'punta-faros', name: 'PUNTA FAROS', short: 'Punta Faros', x: 5650, y: 3950, r: 700, kind: 'point' },
];

/** The smuggler family the player runs for, and the law that hunts them. */
export const FAMILY = {
  matriarch: 'Mamá Yara Quintana',
  player: 'Rayo Cárdenas',
  crew: ['Nando Quintana', 'Lupe Ferrer', 'Chuy Delgado'],
  police: 'Patrulla Estatal',
  heli: 'CÓNDOR-1',
};

/** Dispatch callsigns and the job each unit does when the net closes. */
export const DISPATCH_UNITS = [
  { callsign: 'BRAVO-5', role: 'PURSUIT' },
  { callsign: 'BRAVO-9', role: 'PURSUIT' },
  { callsign: 'SIERRA-2', role: 'RAMMER' },
  { callsign: 'DELTA-7', role: 'ROADBLOCK' },
  { callsign: 'LIMA-3', role: 'SPOTTER' },
  { callsign: 'ORO-4', role: 'PURSUIT' },
];

/** Weapons: slot order is the number-key order and the HUD strip order. */
export const WEAPONS = [
  { id: 'fists', name: 'FISTS', slot: 1, damage: 9, rate: 0.34, range: 26, spread: 0, speed: 0, ammo: Infinity, price: 0, sound: 'swing' },
  { id: 'machete', name: 'MACHETE', slot: 2, damage: 22, rate: 0.42, range: 30, spread: 0, speed: 0, ammo: Infinity, price: 60, sound: 'swing' },
  { id: 'revolver', name: '.38 REVOLVER', slot: 3, damage: 26, rate: 0.38, range: 520, spread: 0.012, speed: 1500, ammo: 6, price: 240, sound: 'shot' },
  { id: 'shotgun', name: 'ESCOPETA 12G', slot: 4, damage: 13, rate: 0.95, range: 300, spread: 0.09, speed: 1250, ammo: 2, price: 420, sound: 'boom', pellets: 6 },
  { id: 'smg', name: 'UZI ARTESANAL', slot: 5, damage: 11, rate: 0.09, range: 430, spread: 0.05, speed: 1400, ammo: 30, price: 680, sound: 'shot' },
  { id: 'rifle', name: 'CARABINA .30', slot: 6, damage: 34, rate: 0.55, range: 760, spread: 0.004, speed: 2100, ammo: 5, price: 950, sound: 'crack' },
];

/** Car models that roll in the lagoon basin: name, size, pace, colour pool, worth. */
export const CAR_MODELS = [
  { id: 'brava', name: "Brava Charger '71", w: 25, l: 52, top: 305, accel: 210, grip: 0.92, colours: ['#c8432b', '#8f2318', '#e07b2a', '#5d1f16'], worth: 4200 },
  { id: 'pickup', name: 'Lodo Pickup', w: 26, l: 54, top: 235, accel: 165, grip: 0.88, colours: ['#7a8894', '#4d5a52', '#96742f', '#37424e'], worth: 1500 },
  { id: 'sedan', name: 'Ceniza Sedan', w: 24, l: 50, top: 250, accel: 175, grip: 0.9, colours: ['#b8b0a2', '#5d6e7a', '#2e2a26', '#71584a'], worth: 1100 },
  { id: 'taxi', name: 'Taxi Brasa', w: 24, l: 50, top: 245, accel: 170, grip: 0.9, colours: ['#d9a521', '#d9a521', '#c78f1d'], worth: 900 },
  { id: 'truck', name: 'Recta Freight Truck', w: 30, l: 86, top: 195, accel: 120, grip: 0.86, colours: ['#8a4f2c', '#54606b', '#6e3b3b'], worth: 2600 },
  { id: 'van', name: 'Furgoneta Taller', w: 27, l: 58, top: 215, accel: 145, grip: 0.87, colours: ['#a8a396', '#476b6e', '#77543a'], worth: 1300 },
];

/** The named export list at Punta Faros: steal each once, deliver it to the dock crane. */
export const EXPORT_CARS = [
  "Brava Charger '71 — rojo quemado",
  "Brava Charger '71 — negro ceniza",
  'Lodo Pickup — verde taller',
  'Ceniza Sedan — plata vieja',
  'Taxi Brasa — amarillo Recta',
  'Recta Freight Truck — óxido',
  'Furgoneta Taller — azul río',
  "Brava Charger '71 — naranja tormenta",
  'Lodo Pickup — barro seco',
  'Ceniza Sedan — blanco hueso',
];

export const SAVE_KEY = 'laguna-brava-save-v1';
export const JUGS_TOTAL = 15;
export const MISSIONS_TOTAL = 15;

/** Which named buildings are shops, and what standing at their door offers.
 *  Lives here, with the rest of the static tables: world.js places the buildings,
 *  economy.js prices the services, minimap.js draws the markers — all read this. */
export const SHOP_KINDS = {
  guns: { label: 'ARMERÍA', action: 'Buy weapons & ammo' },
  diner: { label: 'COMEDOR', action: 'Eat: restore health ($25)' },
  clinic: { label: 'CLÍNICA', action: 'Full treatment ($80)' },
  garage: { label: 'TALLER', action: 'Repair & repaint: lose the heat ($150)' },
  boatyard: { label: 'ASTILLERO', action: 'Repair the airboat ($60)' },
  cantina: { label: 'CANTINA', action: 'Rum & news ($10)' },
  gas: { label: 'GASOLINERA', action: 'Fuel & snacks ($15)' },
  motel: { label: 'MOTEL', action: 'Rest: save the game' },
  dockhouse: { label: 'MUELLE', action: 'Export dock: deliver a listed car' },
};

/** Golden hour is the basin's postcard: the day starts at 17.4 (of 24) and drifts slowly. */
export const DAY_START = 17.4;
export const DAY_LENGTH = 1500; // seconds of play for a full 24h cycle

/** Palette the renderer and menus share, so the whole game wears one dusk. */
export const PALETTE = {
  ink: '#14100c',
  paper: '#f3e2bb',
  gold: '#e8a33d',
  ember: '#c8432b',
  teal: '#2e6f6a',
  lagoon: '#1d4e4a',
  night: '#0d1524',
};
