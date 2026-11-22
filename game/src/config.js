// LAGUNA BRAVA — declarative game data: districts, missions, exports, crew, radio.
export const WORLD = { w: 1200, d: 900 };
export const DISTRICTS = [
  { name: 'Puerto Lodo', x: -320, z: 220, r: 210, color: 0x8a5a2b, standing: 62 },
  { name: 'The Interstate', x: 0, z: -40, r: 260, color: 0x555560, standing: 34 },
  { name: 'Cañaveral Swamp', x: 330, z: 260, r: 230, color: 0x2e5d33, standing: 78 },
  { name: 'Villa Ceniza', x: -300, z: -260, r: 200, color: 0x6b4a5e, standing: 45 },
  { name: 'Faros Point', x: 430, z: -280, r: 170, color: 0x2b5d6e, standing: 51 },
];
export const RADIO = [
  { name: 'Laguna 91.3', tracks: ['“Ciénaga Moon” · Los Faros', '“Mud & Gasoline” · Brava Sisters', '“Tío Knows” · DJ Caimán'] },
  { name: 'Interestatal 106.7', tracks: ['“Ninety in a Fifty” · Truckstop Hearts', '“Asphalt Psalm” · Vera Cruz', '“Sirens in D” · The Offramps'] },
];
export const WEAPONS = [
  { name: 'Fists', icon: '👊', ammo: '∞', price: 0, dmg: 6 },
  { name: 'Machete', icon: '🔪', ammo: '∞', price: 150, dmg: 14 },
  { name: 'Revolver', icon: '🔫', ammo: 48, price: 400, dmg: 26 },
  { name: 'Scattergun', icon: '💥', ammo: 24, price: 900, dmg: 44 },
  { name: 'Carbine', icon: '🎯', ammo: 120, price: 1800, dmg: 20 },
  { name: 'Sniper', icon: '🔭', ammo: 12, price: 3200, dmg: 90, locked: true },
  { name: 'Molotov', icon: '🔥', ammo: 6, price: 750, dmg: 55, locked: true },
];
export const CREW = [
  { name: 'Nando', role: 'Airboat Mechanic', ability: 'FAN BOOST', key: 'Z', icon: '🛠️', cd: 20 },
  { name: 'Lupe', role: 'Wheel Witch', ability: 'QUICK FIX', key: 'X', icon: '🔧', cd: 25 },
  { name: 'Chuy', role: 'Lookout', ability: 'EYES OUT', key: 'C', icon: '🦅', cd: 18 },
];
export const EXPORT_CARS = ['Brava Charger ’69', 'Ceniza Falcon', 'Lodo Impala SS', 'Faros Roadrunner', 'Caimán Barracuda', 'Interstate GTO', 'Swampcat Challenger', 'Puerto Torino', 'Villa Monte Carlo', 'Braulio Special ’57'];
export const POLICE_NAMES = ['BRAVO-5', 'BRAVO-9', 'SIERRA-2', 'DELTA-7', 'LIMA-3', 'GARZA'];
export const MISSIONS = [
  { id: 1, title: 'First Run for Tío', giver: 'Tío Braulio Fuentes', role: 'Swamp Patriarch', avatar: '🧔🏽', pay: 800, rep: 12,
    line: 'Mijo, take my moonshine across the channel in the AIRBOAT — fan on, slide the mud, don’t spill a drop.',
    stages: [
      { text: 'Board the airboat at the Cañaveral dock', next: 'Press E at the fan boat', x: 300, z: 300, mode: 'airboat' },
      { text: 'Slide the swamp channel to the drop buoy', next: 'Ride the channel north', x: 330, z: 60, mode: 'airboat' },
      { text: 'Return to Tío Braulio in Puerto Lodo', next: 'Follow the brass lantern', x: -300, z: 210, mode: 'any' } ] },
  { id: 2, title: 'Interstate Muscle', giver: 'Tío Braulio Fuentes', role: 'Swamp Patriarch', avatar: '🧔🏽', pay: 1400, rep: 14,
    line: 'Steal the Brava Charger on the INTERSTATE — E to STEAL it — and outrun the Patrulla trucks to Faros.',
    stages: [
      { text: 'Steal the Brava Charger ’69 on the interstate', next: 'Press E — STEAL beside the car', x: 0, z: -40, mode: 'steal' },
      { text: 'Race the interstate checkpoint', next: 'Stay on the highway, dodge trucks', x: 260, z: -40, mode: 'car' },
      { text: 'Deliver to the Faros Point dock', next: 'Park in the gold ring', x: 430, z: -260, mode: 'car' } ] },
  { id: 3, title: 'Ceniza Heat', giver: 'Lupe', role: 'Wheel Witch', avatar: '👩🏽‍🔧', pay: 1800, rep: 16,
    line: 'Villa Ceniza owes us. Go on FOOT, use your SHOOTING — F to fire — and clear the plaza guards.',
    stages: [
      { text: 'Reach Villa Ceniza plaza on foot', next: 'Head north-west', x: -300, z: -250, mode: 'foot' },
      { text: 'Win the plaza shootout (3 guards)', next: 'Press F to shoot, watch damage numbers', x: -285, z: -235, mode: 'combat' },
      { text: 'Escape to Puerto Lodo', next: 'Lose the Patrulla first', x: -320, z: 220, mode: 'any' } ] },
  { id: 4, title: 'Truck Stop Tribute', giver: 'Tío Braulio Fuentes', role: 'Swamp Patriarch', avatar: '🧔🏽', pay: 2200, rep: 18,
    line: 'A truck on the INTERSTATE carries our tribute. RAM it, grab the crate, and bring it home.',
    stages: [
      { text: 'Intercept the tribute truck', next: 'Chase the orange truck marker', x: 120, z: -40, mode: 'car' },
      { text: 'Collect the tribute crate', next: 'Stop the truck, grab the crate', x: 180, z: -30, mode: 'any' },
      { text: 'Deliver the crate to Villa Ceniza', next: 'Gold ring at the chapel', x: -290, z: -270, mode: 'any' } ] },
  { id: 5, title: 'Garza in the Sky', giver: 'Chuy', role: 'Lookout', avatar: '🧢', pay: 2800, rep: 20,
    line: 'At four stars GARZA the air unit hunts you with a SPOTLIGHT. Break its line of sight under the cypress canopy.',
    stages: [
      { text: 'Raise wanted to 4 stars near the interstate', next: 'Cause mayhem, wait for GARZA', x: 40, z: -60, mode: 'mayhem' },
      { text: 'Hide in Cañaveral Swamp canopy', next: 'Stay out of the spotlight', x: 350, z: 280, mode: 'any' },
      { text: 'Report back to Chuy at Faros Point', next: 'Gold ring by the lighthouse', x: 440, z: -290, mode: 'any' } ] },
  { id: 6, title: 'The Export List', giver: 'Tío Braulio Fuentes', role: 'Swamp Patriarch', avatar: '🧔🏽', pay: 3600, rep: 24,
    line: 'The EXPORT LIST, mijo: named muscle cars, delivered to Faros Point dock. Start with the Caimán Barracuda.',
    stages: [
      { text: 'Find the Caimán Barracuda in Puerto Lodo', next: 'Teal muscle car, brass marker', x: -260, z: 180, mode: 'steal' },
      { text: 'Export it at Faros Point dock', next: 'Drive onto the dock ring', x: 430, z: -260, mode: 'car' },
      { text: 'Collect your export bonus from Tío', next: 'Return to Puerto Lodo', x: -300, z: 210, mode: 'any' } ] },
  { id: 7, title: 'Laguna Brava', giver: 'Tío Braulio Fuentes', role: 'Swamp Patriarch', avatar: '🧔🏽', pay: 6000, rep: 40,
    line: 'One last run: airboat the swamp, muscle the interstate, and light the Faros beacon. Become Laguna Brava.',
    stages: [
      { text: 'Airboat the full swamp channel', next: 'Fan boost with Nando [Z]', x: 330, z: 60, mode: 'airboat' },
      { text: 'Sprint the interstate end to end', next: 'Beat the trucks to Faros', x: 300, z: -40, mode: 'car' },
      { text: 'Light the Faros Point beacon', next: 'Stand in the lighthouse ring', x: 455, z: -300, mode: 'any' } ] },
];
export const RANKS = [[0, 'SWAMP RUNNER'], [60, 'MUD DEALER'], [130, 'HIGHWAY GHOST'], [220, 'BRAVA CAPO'], [340, 'LAGUNA LEGEND']];
