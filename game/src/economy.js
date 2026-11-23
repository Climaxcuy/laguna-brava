// Money, mercy and paperwork: the basin's economy. Shops work from their doorsteps — stand
// at the door, press E, and the keeper does the rest — because the season is too short for
// interiors. Pickups are the world's loose change: rum jugs in the reeds, crates on the
// dock, cash in a fallen rival's pocket. Saves live in three slots in the browser, plus an
// autosave the game keeps after every passed job, because storms take houses here.

import { EXPORT_CARS, JUGS_TOTAL, MISSIONS_TOTAL, SAVE_KEY, SHOP_KINDS, WEAPONS } from './config.js';
import { dist } from './rng.js';

export function createEconomy() {
  return {
    updatePickups,
    shopUse,
    buyWeapon,
    buyAmmo,
    completion,
    rankName,
    saveGame,
    loadGame,
    readSlots,
    autosave,
    applySave,
  };
}

function floater(G, x, y, text, colour = '#f3e2bb', size = 15) {
  G.floaters.push({ x, y, text, life: 1.4, maxLife: 1.4, colour, size });
}

/** What fraction of everything there is to do has been done: jobs, jugs, exports. */
export function completion(G) {
  const done = G.stats.missionsDone + G.stats.jugs + G.stats.exports;
  const total = MISSIONS_TOTAL + JUGS_TOTAL + EXPORT_CARS.length;
  return done / total;
}

/** The basin's ladder of respect, read off reputation. */
export function rankName(rep) {
  if (rep >= 1000) return 'LEYENDA DE LA LAGUNA';
  if (rep >= 600) return 'REY DEL LODO';
  if (rep >= 300) return 'PATRÓN MENOR';
  if (rep >= 120) return 'MANDADERO';
  return 'MOJADO';
}

/** Loose things get picked up by walking (or floating, or rolling) over them. */
export function updatePickups(G, dt) {
  const p = G.player;
  const reach = p.mode === 'foot' ? 36 : 64;
  for (const pk of G.pickups) {
    pk.bobPhase = (pk.bobPhase ?? 0) + dt * 2.4;
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) > reach) continue;
    pk.taken = true;
    if (pk.kind === 'jug') {
      G.stats.jugs += 1;
      p.cash += 40;
      const jug = G.world.jugs[pk.jugId];
      if (jug) jug.taken = true;
      floater(G, pk.x, pk.y - 20, `GARRAFA ${G.stats.jugs}/${JUGS_TOTAL} · +$40`, '#e8a33d');
      G.audio.pickup();
    } else if (pk.kind === 'cash') {
      p.cash += pk.amount ?? 25;
      floater(G, pk.x, pk.y - 20, `+$${pk.amount ?? 25}`, '#9fe8b0');
      G.audio.cash();
    } else if (pk.kind === 'debt') {
      const amount = 120 + Math.floor(G.rng.range(0, 130));
      p.cash += amount;
      floater(G, pk.x, pk.y - 24, `DEUDA COBRADA · +$${amount}`, '#9fe8b0', 16);
      G.audio.cash();
      if (G.missions.active?.rt) G.missions.active.rt.collected += 1;
    } else {
      // crate | supply | meds: mission cargo, counted by the stage engine.
      if (G.missions.active?.rt) G.missions.active.rt.collected += 1;
      floater(G, pk.x, pk.y - 20, pk.kind === 'supply' ? 'BULTO CARGADO' : 'CAJA CARGADA', '#f3e2bb');
      G.audio.pickup();
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
}

/** The doorstep transaction. Returns a line for the banner, or null when nothing happened. */
export function shopUse(G, building) {
  const p = G.player;
  switch (building.kind) {
    case 'guns':
      G.shopOpen = building;
      return 'Armería El Faro — ¿qué va a llevar?';
    case 'motel':
      G.shopOpen = building;
      return 'Motel Brasa — guardar la partida';
    case 'diner': {
      if (p.cash < 25) return 'Sin dinero no hay caldo.';
      if (p.hp >= 100) return 'Ya comiste, Rayo.';
      p.cash -= 25;
      p.hp = Math.min(100, p.hp + 55);
      G.audio.cash();
      return 'Caldo de mariscos: +55 de vida.';
    }
    case 'clinic': {
      if (p.cash < 80) return 'La clínica cobra por adelantado.';
      p.cash -= 80;
      p.hp = 100;
      p.armour = Math.max(p.armour, 50);
      G.audio.cash();
      return 'Curado y blindado: vida llena, chaleco al 50.';
    }
    case 'garage': {
      if (p.mode !== 'car' || !p.car) return 'Trae el coche al Taller.';
      if (p.cash < 150) return 'El repintado cuesta $150.';
      p.cash -= 150;
      p.car.health = 100;
      p.car.wrecked = false;
      G.police.stars = 0;
      G.police.sight = 'CALM';
      G.police.unseenT = 0;
      G.audio.cash();
      return 'Repintado. La Patrulla ya no conoce este coche.';
    }
    case 'boatyard': {
      const boat = p.mode === 'boat' ? p.boat : G.boats.find((b) => dist(b.x, b.y, p.x, p.y) < 200);
      if (!boat) return 'No hay lancha que reparar aquí.';
      if (p.cash < 60) return 'El arreglo cuesta $60.';
      p.cash -= 60;
      boat.hull = 100;
      G.audio.cash();
      return 'Casco como nuevo.';
    }
    case 'cantina': {
      if (p.cash < 10) return 'Ni para un trago.';
      p.cash -= 10;
      p.rep += 2;
      G.audio.cash();
      const rumors = [
        'Dicen que el Cóndor vuela bajo cuando huele ron.',
        'El Mudo apostó su lancha. Otra vez.',
        'La Tormenta llega mañana, dicen. Siempre dicen.',
        'Un Charger rojo vale más en Faros que aquí.',
      ];
      return G.rng.pick(rumors);
    }
    case 'gas': {
      if (p.cash < 15) return 'La gasolina no se fía.';
      p.cash -= 15;
      p.hp = Math.min(100, p.hp + 15);
      G.audio.cash();
      return 'Tanque lleno y empanada: +15 de vida.';
    }
    case 'dockhouse': {
      if (p.mode === 'car' && p.car && p.car.exportId >= 0 && !G.exports[p.car.exportId]) {
        const idx = p.car.exportId;
        const worth = p.car.model.worth;
        G.exports[idx] = true;
        G.stats.exports += 1;
        p.cash += worth;
        p.rep += 25;
        p.car.exportId = -1;
        G.audio.missionDone();
        G.audio.cash();
        return `EXPORTADO: ${EXPORT_CARS[idx]} · +$${worth}`;
      }
      return 'El muelle compra coches de la lista. Solo de la lista.';
    }
    default:
      return null;
  }
}

/** Buy the weapon in a slot at the Armería; ammo comes with the first purchase. */
export function buyWeapon(G, slot) {
  const p = G.player;
  const weapon = WEAPONS[slot - 1];
  const owned = p.weapons[slot];
  if (!weapon || !owned) return 'Eso no se vende aquí.';
  if (owned.owned) return buyAmmo(G, slot);
  if (p.cash < weapon.price) return `Cuesta $${weapon.price}. Te faltan $${weapon.price - p.cash}.`;
  p.cash -= weapon.price;
  owned.owned = true;
  owned.ammo = weapon.ammo === Infinity ? Infinity : weapon.ammo * 4;
  p.weaponSlot = slot;
  G.audio.cash();
  return `${weapon.name} es tuyo. Cuídalo.`;
}

/** Refill a slot's ammunition at the Armería's counter price. */
export function buyAmmo(G, slot) {
  const p = G.player;
  const weapon = WEAPONS[slot - 1];
  const owned = p.weapons[slot];
  if (!weapon || !owned?.owned || weapon.ammo === Infinity) return 'Eso no usa balas.';
  const price = Math.ceil(weapon.price * 0.25);
  if (p.cash < price) return `La caja cuesta $${price}.`;
  p.cash -= price;
  owned.ammo += weapon.ammo * 4;
  G.audio.cash();
  return `${weapon.name}: caja llena.`;
}

// ---------------------------------------------------------------- saves

function snapshot(G) {
  const p = G.player;
  return {
    v: 1,
    missionsNext: G.missions.next,
    missionsDone: G.missions.done.slice(),
    cash: p.cash,
    rep: p.rep,
    weapons: Object.fromEntries(Object.entries(p.weapons).map(([slot, w]) => [slot, { owned: w.owned, ammo: w.ammo === Infinity ? -1 : w.ammo }])),
    jugs: G.world.jugs.filter((j) => j.taken).map((j) => j.id),
    exports: G.exports.slice(),
    stats: { ...G.stats },
    playSeconds: Math.floor(G.playSeconds),
    savedAt: new Date().toISOString(),
  };
}

export function applySave(G, data) {
  if (!data || data.v !== 1) return false;
  const p = G.player;
  G.missions.next = data.missionsNext ?? 0;
  G.missions.done = MISSIONS_TOTAL === (data.missionsDone ?? []).length
    ? data.missionsDone.slice()
    : G.missions.done.map((_, i) => (data.missionsDone ?? [])[i] ?? false);
  G.missions.active = null;
  p.cash = data.cash ?? 0;
  p.rep = data.rep ?? 0;
  for (const [slot, w] of Object.entries(data.weapons ?? {})) {
    if (p.weapons[slot]) {
      p.weapons[slot].owned = w.owned;
      p.weapons[slot].ammo = w.ammo === -1 ? Infinity : w.ammo;
    }
  }
  for (const jug of G.world.jugs) jug.taken = (data.jugs ?? []).includes(jug.id);
  G.pickups = G.pickups.filter((pk) => pk.kind !== 'jug' || !G.world.jugs[pk.jugId]?.taken);
  G.exports = data.exports ?? G.exports;
  Object.assign(G.stats, data.stats ?? {});
  return true;
}

function readStore() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '{"slots":[null,null,null]}');
  } catch {
    return { slots: [null, null, null] };
  }
}

export function readSlots() {
  return readStore().slots ?? [null, null, null];
}

export function saveGame(G, slot) {
  try {
    const store = readStore();
    store.slots[slot] = snapshot(G);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(G, slot) {
  const slots = readSlots();
  if (!slots[slot]) return false;
  return applySave(G, slots[slot]);
}

export function autosave(G) {
  try {
    window.localStorage.setItem(SAVE_KEY + ':auto', JSON.stringify(snapshot(G)));
  } catch { /* storage off: the season forgets, the player remembers */ }
}

export { SHOP_KINDS };
