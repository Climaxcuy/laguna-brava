// The storm-season campaign: fifteen jobs for Mamá Yara Quintana, from a first rum run to
// the night the Tormenta makes landfall. Missions are data — a list of stages the engine
// below walks — so the story can be long without the code being clever. Stage kinds:
//   goto     reach the ring (optionally in a set mode: foot | car | boat)
//   pickup   gather N marked crates at the listed points
//   course   pass the checkpoints in order before the clock dies (boat time-trials)
//   tail     keep the target in the goldilocks band until the bar fills
//   defend   put every rival of the wave down
//   race     beat the rival fan boat through the checkpoints
//   escort   keep the truck alive to the end of its road
//   steal    be sitting in the named car
//   chase    reach the ring still carrying at least `needStars` of heat
//   lose     be somewhere with zero heat (a repaint at the Taller helps)
//   ferry    collect the waiting villagers by boat, then land them at the last point

import { dist } from './rng.js';
import { makePed } from './peds.js';
import { makeAirboat, stepRivalBoat } from './airboat.js';
import { driveCar, driveToward, makeCar, pointAlong, ROAD_PATHS } from './vehicles.js';
import { CAR_MODELS } from './config.js';

export const MISSIONS = [
  {
    id: 'primera-carga', title: 'LA PRIMERA CARGA', giver: 'Mamá Yara',
    brief: 'Cuatro cajas de ron de la Destilería. Al muelle del Astillero. Sin prisa, sin testigos.',
    reward: { cash: 650, rep: 40 },
    stages: [
      { type: 'goto', text: 'Ve a la Destilería La Caña', next: 'Habla con el capataz', x: 1400, y: 2030, r: 90 },
      { type: 'pickup', text: 'Carga las cajas de ron', next: '4 cajas al camión', count: 4, points: [[1330, 2010], [1420, 2050], [1380, 1960], [1470, 2000]] },
      { type: 'goto', text: 'Entrega en el Astillero Quintana', next: 'Muelle de Puerto Barro', x: 1200, y: 4040, r: 110 },
    ],
  },
  {
    id: 'correo-de-aire', title: 'CORREO DE AIRE', giver: 'Nando',
    brief: 'El canal tiene dueño nuevo: tú. Marca las boyas hasta Ciénaga antes de que caiga el sol.',
    reward: { cash: 700, rep: 50 },
    stages: [
      { type: 'goto', text: 'Sube a la lancha de Puerto Barro', next: 'Amarras del muelle', x: 1500, y: 3980, r: 90, mode: 'boat' },
      {
        type: 'course', text: 'Sigue las boyas del canal', next: 'Llega a Ciénaga Verde', time: 150,
        points: [[1560, 3400], [1700, 2750], [1780, 2380]],
      },
    ],
  },
  {
    id: 'medicina', title: 'MEDICINA PARA BRASA', giver: 'Lupe',
    brief: 'La clínica de Villa Brasa se quedó sin suero. La caja va en el Comedor. Corre, pero no mates a nadie.',
    reward: { cash: 800, rep: 55 },
    stages: [
      { type: 'pickup', text: 'Recoge la caja de medicina', next: 'Comedor La Marea', count: 1, points: [[955, 3560]] },
      { type: 'goto', text: 'Llévala a la Clínica Santa Brasa', next: 'Por el Camino del Lodo y La Recta', x: 5360, y: 1270, r: 100, time: 300 },
    ],
  },
  {
    id: 'el-peaje', title: 'EL PEAJE', giver: 'Chuy',
    brief: 'La Patrulla puso un retén en La Recta. Pásalo, llega al Motel Brasa… y luego piérdete.',
    reward: { cash: 950, rep: 70 },
    stages: [
      { type: 'goto', text: 'Llega a la Gasolinera Recta', next: 'El retén está al este', x: 2937, y: 560, r: 110 },
      { type: 'chase', text: 'Rompe el retén y llega al Motel Brasa', next: 'Con la Patrulla detrás', x: 3995, y: 830, r: 120, needStars: 3 },
      { type: 'lose', text: 'Pierde a la Patrulla', next: 'Rompe la línea de vista' },
    ],
  },
  {
    id: 'cobros', title: 'COBROS EN EL MUELLE', giver: 'Mamá Yara',
    brief: 'Tres deudores en Puerto Barro. Cobra con palabras. El tercero… el tercero trae amigos.',
    reward: { cash: 850, rep: 60 },
    stages: [
      { type: 'pickup', text: 'Cobra las tres deudas', next: 'Marcados en el pueblo', count: 3, points: [[1010, 3700], [760, 3560], [1180, 3860]], kind: 'debt' },
      { type: 'defend', text: 'Los amigos del tercero', next: 'Que aprendan', x: 1120, y: 3800, waves: [[2]] },
    ],
  },
  {
    id: 'agua-de-noche', title: 'AGUA DE NOCHE', giver: 'Mamá Yara',
    brief: 'La Isla Tormenta guarda el ron bueno. Trae tres cajas antes de que amanezca del todo.',
    reward: { cash: 1100, rep: 80 },
    stages: [
      { type: 'goto', text: 'Atraca en la Isla Tormenta', next: 'Muelle oeste de la isla', x: 3520, y: 3000, r: 120, mode: 'boat' },
      { type: 'pickup', text: 'Carga el ron de la isla', next: 'Almacén Tormenta', count: 3, points: [[3960, 2960], [3900, 3010], [4020, 2940]] },
      { type: 'goto', text: 'Vuelve a Puerto Barro', next: 'Antes de que se acabe el tiempo', x: 1500, y: 3980, r: 120, mode: 'boat', time: 330 },
    ],
  },
  {
    id: 'metal-caliente', title: 'METAL CALIENTE', giver: 'Nando',
    brief: 'En Autos Brasa duerme un Charger rojo quemado con nombre en la lista de Punta Faros. Tráelo entero.',
    reward: { cash: 1400, rep: 95 },
    stages: [
      { type: 'goto', text: 'Ve a Autos Brasa', next: 'El lote de Villa Brasa', x: 5460, y: 1400, r: 120 },
      { type: 'steal', text: 'Roba el Brava Charger rojo quemado', next: 'Es el de la lista de exportación', exportId: 0 },
      { type: 'goto', text: 'Entrégalo en el Muelle de Exportación', next: 'Punta Faros, junto a la grúa', x: 5455, y: 4030, r: 110, mode: 'car' },
    ],
  },
  {
    id: 'antes-de-la-tormenta', title: 'ANTES DE LA TORMENTA', giver: 'Lupe',
    brief: 'Viene la Tormenta. Cinco bultos de provisiones repartidos por la cuenca. Todos a Casa Quintana.',
    reward: { cash: 1000, rep: 75 },
    stages: [
      { type: 'pickup', text: 'Reúne las provisiones', next: '5 bultos por la cuenca', count: 5, points: [[1000, 3500], [2900, 580], [5200, 1060], [5620, 3800], [1420, 2100]], kind: 'supply' },
      { type: 'goto', text: 'Entrégalas en Casa Quintana', next: 'Puerto Barro', x: 760, y: 3910, r: 100 },
    ],
  },
  {
    id: 'el-soplon', title: 'EL SOPLÓN', giver: 'Chuy',
    brief: 'Un sedán plata sale del Motel Brasa cada tarde. Síguelo sin que te vea. Necesitamos su destino.',
    reward: { cash: 1200, rep: 85 },
    stages: [
      { type: 'goto', text: 'Espera junto al Motel Brasa', next: 'Que salga el sedán', x: 3995, y: 860, r: 130 },
      { type: 'tail', text: 'Sigue al sedán plata', next: 'Ni cerca ni lejos', duration: 42, routeRoad: 3, fromS: 2750, toS: 300 },
      { type: 'goto', text: 'El destino era la Destilería', next: 'Confírmalo en persona', x: 1400, y: 2030, r: 100 },
    ],
  },
  {
    id: 'fuego-en-la-cana', title: 'FUEGO EN LA CAÑA', giver: 'Mamá Yara',
    brief: 'Los Hermanos Ciénaga vienen por la Destilería. Que sepan que la caña tiene dueño.',
    reward: { cash: 1500, rep: 110 },
    stages: [
      { type: 'goto', text: 'Llega a la Destilería La Caña', next: 'Ya se oyen los motores', x: 1400, y: 2030, r: 120 },
      { type: 'defend', text: 'Defiende la Destilería', next: 'Dos oleadas de Hermanos', x: 1400, y: 2030, waves: [[3], [3]] },
    ],
  },
  {
    id: 'ojos-del-condor', title: 'OJOS DEL CÓNDOR', giver: 'Lupe',
    brief: 'El Cóndor-1 vuela hoy. Llega al Faro con todo el cielo mirando… y apágalo en el Taller Brasa.',
    reward: { cash: 1700, rep: 120 },
    stages: [
      { type: 'chase', text: 'Llega al Faro de Punta Faros', next: 'Con el Cóndor encima', x: 5940, y: 4160, r: 130, needStars: 4 },
      { type: 'goto', text: 'Escóndete en el Taller Brasa', next: 'Repintado y olvido: $150', x: 4990, y: 1110, r: 110 },
      { type: 'lose', text: 'Que el nivel llegue a cero', next: 'Sin que te vean' },
    ],
  },
  {
    id: 'el-convoy', title: 'EL CONVOY DE YARA', giver: 'Mamá Yara',
    brief: 'Mi camión cruza La Recta al amanecer con la mercancía de la temporada. Tú eres su sombra.',
    reward: { cash: 1900, rep: 130 },
    stages: [
      { type: 'goto', text: 'Encuentra el camión en la Gasolinera', next: 'La Recta, al oeste', x: 2937, y: 560, r: 130 },
      { type: 'escort', text: 'Escolta el camión hasta Villa Brasa', next: 'Que llegue entero', routeRoad: 0, fromS: 2700, toS: 4900 },
    ],
  },
  {
    id: 'la-carrera', title: 'LA CARRERA DEL CANAL', giver: 'Nando',
    brief: 'El Mudo dice que su lancha es más rápida que la tuya. La laguna decide: hasta la Isla Tormenta.',
    reward: { cash: 1600, rep: 115 },
    stages: [
      { type: 'goto', text: 'A la línea de salida, Puerto Barro', next: 'Junto a la lancha del Mudo', x: 1500, y: 3980, r: 100, mode: 'boat' },
      {
        type: 'race', text: 'Gana la carrera a la Isla Tormenta', next: 'Muelle este de la isla', pace: 0.92,
        points: [[2050, 3720], [2560, 3380], [3080, 3220], [3700, 3150], [4400, 3080]],
      },
    ],
  },
  {
    id: 'la-ultima-lancha', title: 'LA ÚLTIMA LANCHA', giver: 'Lupe',
    brief: 'Tres almas esperan en los muelles y la Tormenta ya huele el aire. Recógelas. A todas.',
    reward: { cash: 1800, rep: 125 },
    stages: [
      {
        type: 'ferry', text: 'Recoge a los tres vecinos', next: 'Ciénaga · Isla · Faros', time: 460,
        points: [[1800, 2400], [3520, 3000], [5360, 3860]], deliver: [1500, 3980],
      },
    ],
  },
  {
    id: 'tormenta', title: 'TORMENTA', giver: 'Mamá Yara',
    brief: 'El libro de cuentas cruza la laguna esta noche, con cinco estrellas encima. Isla, Faros, casa. Vive.',
    reward: { cash: 2600, rep: 200 },
    stages: [
      { type: 'chase', text: 'Recoge el libro en el Almacén Tormenta', next: 'Toda la Patrulla en el agua', x: 3980, y: 2950, r: 130, needStars: 5 },
      { type: 'goto', text: 'Déjalo en el Muelle de Exportación', next: 'Punta Faros', x: 5455, y: 4030, r: 120 },
      { type: 'goto', text: 'Vuelve a Casa Quintana', next: 'El fin de la temporada', x: 760, y: 3910, r: 110 },
    ],
  },
];

export function createMissions() {
  return {
    next: 0,
    active: null,
    done: MISSIONS.map(() => false),
    startNext,
    update,
    hudData,
    marker,
    abandon,
  };
}

function banner(G, title, line) {
  G.banner = { title, line, t: 0, dur: 4.2 };
}

function startNext(G) {
  const M = G.missions;
  if (M.active || M.next >= MISSIONS.length) return false;
  const mission = MISSIONS[M.next];
  M.active = { mission, idx: M.next, stageIdx: 0, rt: null, failed: false };
  enterStage(G);
  banner(G, `JOB ${M.next + 1}/${MISSIONS.length} — ${mission.title}`, mission.brief);
  G.audio.missionDone();
  return true;
}

function abandon(G, reason) {
  const M = G.missions;
  if (!M.active) return;
  banner(G, 'JOB FAILED', reason ?? 'La temporada no perdona.');
  G.audio.missionFail();
  cleanupStage(G);
  M.active = null;
}

function cleanupStage(G) {
  const M = G.missions;
  const rt = M.active?.rt;
  if (!rt) return;
  if (rt.spawned) {
    for (const ped of rt.spawned) ped.remove = true;
  }
  if (rt.targetCar) {
    rt.targetCar.driver = 'parked';
    rt.targetCar.route = null;
  }
  if (rt.rivalBoat) rt.rivalBoat.driver = null;
  G.pickups = G.pickups.filter((pk) => !pk.mission);
}

function enterStage(G) {
  const M = G.missions;
  const stage = M.active.mission.stages[M.active.stageIdx];
  const rt = { t: stage.time ?? null, collected: 0, progress: 0, spawned: [], wave: 0, spottedT: 0 };
  M.active.rt = rt;
  const p = G.player;
  if (stage.type === 'pickup') {
    for (const [x, y] of stage.points) {
      G.pickups.push({ kind: stage.kind ?? 'crate', x, y, mission: true, bobPhase: G.rng.range(0, 6) });
    }
  }
  if (stage.type === 'defend') {
    spawnWave(G, stage, rt);
  }
  if (stage.type === 'chase') {
    G.police.stars = Math.max(G.police.stars, stage.needStars);
    G.police.sight = 'INSIGHT';
    G.police.lastSeen = { x: p.x, y: p.y };
  }
  if (stage.type === 'tail') {
    const path = ROAD_PATHS[stage.routeRoad];
    const pos = pointAlong(path, stage.fromS, 26);
    const car = makeCar(CAR_MODELS[2], pos.x, pos.y, pos.angle, '#b8b0a2');
    car.driver = 'mission';
    car.route = { path, s: stage.fromS, dir: -1, cruise: 0.42 };
    car.name = 'Ceniza Sedan — plata vieja';
    G.cars.push(car);
    rt.targetCar = car;
  }
  if (stage.type === 'race') {
    const boat = makeAirboat(stage.points[0][0] - 500, stage.points[0][1] + 160, 0.4);
    boat.driver = 'rival';
    boat.wp = 0;
    boat.name = 'La del Mudo';
    G.boats.push(boat);
    rt.rivalBoat = boat;
    rt.checkpoint = 0;
  }
  if (stage.type === 'escort') {
    const path = ROAD_PATHS[stage.routeRoad];
    const pos = pointAlong(path, stage.fromS, 26);
    const truck = makeCar(CAR_MODELS[4], pos.x, pos.y, pos.angle, '#8a4f2c');
    truck.driver = 'mission';
    truck.route = { path, s: stage.fromS, dir: 1, cruise: 0.5 };
    truck.name = 'Camión de Yara';
    truck.health = 100;
    G.cars.push(truck);
    rt.truck = truck;
    rt.rivalTimer = 6;
  }
  if (stage.type === 'ferry') {
    for (const [x, y] of stage.points) {
      const ped = makePed(x + G.rng.range(-16, 16), y + G.rng.range(-16, 16), { missionRole: 'villager', wanderR: 12 });
      G.peds.push(ped);
      rt.spawned.push(ped);
    }
    rt.aboard = 0;
  }
  if (M.active.mission.id === 'tormenta') G.weather.storm = 1;
}

function spawnWave(G, stage, rt) {
  const counts = stage.waves[rt.wave] ?? [];
  const n = counts[0] ?? 0;
  for (let i = 0; i < n; i += 1) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + G.rng.range(-0.3, 0.3);
    const x = stage.x + Math.cos(a) * G.rng.range(240, 340);
    const y = stage.y + Math.sin(a) * G.rng.range(240, 340);
    const ped = makePed(x, y, {
      hostile: true, armed: true, hp: 42,
      weapon: G.rng.pick(['revolver', 'shotgun', 'smg']),
      shirt: '#3a3f45', name: 'Hermano Ciénaga',
    });
    ped.state = 'fight';
    G.peds.push(ped);
    rt.spawned.push(ped);
  }
}

function stageDone(G) {
  const M = G.missions;
  const active = M.active;
  cleanupStage(G);
  active.stageIdx += 1;
  if (active.stageIdx >= active.mission.stages.length) {
    const { reward } = active.mission;
    G.player.cash += reward.cash;
    G.player.rep += reward.rep;
    G.stats.missionsDone += 1;
    M.done[active.idx] = true;
    M.next = active.idx + 1;
    M.active = null;
    banner(G, 'MISSION PASSED', `${active.mission.title} · +$${reward.cash} · +${reward.rep} REP`);
    G.audio.missionDone();
    G.audio.cash();
    if (active.mission.id === 'tormenta') G.weather.storm = 0.4;
    G.economy.autosave(G);
  } else {
    enterStage(G);
    const stage = active.mission.stages[active.stageIdx];
    banner(G, active.mission.title, stage.text);
  }
}

function modeOk(G, stage) {
  if (!stage.mode) return true;
  return G.player.mode === stage.mode;
}

function update(G, dt) {
  const M = G.missions;
  const active = M.active;
  if (!active || G.player.dead) return;
  const stage = active.mission.stages[active.stageIdx];
  const rt = active.rt;
  const p = G.player;

  if (rt.t !== null && rt.t !== undefined) {
    rt.t -= dt;
    if (rt.t <= 0) {
      abandon(G, 'Se acabó el tiempo.');
      return;
    }
  }

  switch (stage.type) {
    case 'goto': {
      if (dist(p.x, p.y, stage.x, stage.y) < stage.r && modeOk(G, stage)) stageDone(G);
      break;
    }
    case 'chase': {
      if (dist(p.x, p.y, stage.x, stage.y) < stage.r && G.police.stars >= stage.needStars - 0.5) stageDone(G);
      break;
    }
    case 'lose': {
      if (G.police.stars <= 0.01 && G.police.sight === 'CALM') stageDone(G);
      break;
    }
    case 'pickup': {
      // Collection itself happens in economy.updatePickups, which bumps rt.collected.
      if (rt.collected >= stage.count) stageDone(G);
      break;
    }
    case 'course': {
      const target = stage.points[rt.checkpoint ?? 0];
      if (!target) { stageDone(G); break; }
      if (p.mode === 'boat' && dist(p.x, p.y, target[0], target[1]) < 150) {
        rt.checkpoint = (rt.checkpoint ?? 0) + 1;
        G.audio.pickup();
        if (rt.checkpoint >= stage.points.length) stageDone(G);
      }
      break;
    }
    case 'steal': {
      if (p.mode === 'car' && p.car && p.car.exportId === stage.exportId) stageDone(G);
      break;
    }
    case 'tail': {
      const car = rt.targetCar;
      if (!car || car.wrecked) { abandon(G, 'El soplón se estrelló.'); break; }
      // The target drives its road at a cruise, slow enough to follow all day.
      driveMissionCar(G, car, dt);
      const d = dist(p.x, p.y, car.x, car.y);
      if (d > 110 && d < 400) {
        rt.progress += dt;
        rt.spottedT = Math.max(0, rt.spottedT - dt * 2);
      } else {
        rt.progress = Math.max(0, rt.progress - dt * 0.5);
        if (d <= 110) {
          rt.spottedT += dt;
          if (rt.spottedT > 3) { abandon(G, 'Te vio por el retrovisor.'); break; }
        }
      }
      if (car.route && car.route.s <= (stage.toS ?? 0) + 40 && rt.progress < stage.duration * 0.6) {
        abandon(G, 'Llegó sin que sepamos nada.');
        break;
      }
      if (rt.progress >= stage.duration) stageDone(G);
      break;
    }
    case 'defend': {
      const alive = rt.spawned.filter((ped) => !ped.down && !ped.remove);
      if (alive.length === 0) {
        rt.wave += 1;
        if (rt.wave >= stage.waves.length) stageDone(G);
        else {
          spawnWave(G, stage, rt);
          banner(G, active.mission.title, '¡Otra oleada!');
        }
      }
      break;
    }
    case 'race': {
      const rival = rt.rivalBoat;
      const rivalDone = stepRivalBoat(G, rival, stage.points, dt, stage.pace);
      const target = stage.points[rt.checkpoint ?? 0];
      if (target && p.mode === 'boat' && dist(p.x, p.y, target[0], target[1]) < 150) {
        rt.checkpoint += 1;
        G.audio.pickup();
        if (rt.checkpoint >= stage.points.length) { stageDone(G); break; }
      }
      if (rivalDone && (rt.checkpoint ?? 0) < stage.points.length) {
        abandon(G, 'El Mudo llegó primero. La laguna ha decidido.');
      }
      break;
    }
    case 'escort': {
      const truck = rt.truck;
      if (!truck || truck.wrecked || truck.sunk) { abandon(G, 'El camión no llegó.'); break; }
      driveMissionCar(G, truck, dt);
      rt.rivalTimer -= dt;
      if (rt.rivalTimer <= 0 && rt.spawnedCars === undefined) {
        rt.spawnedCars = true;
        for (let i = 0; i < 2; i += 1) {
          const path = ROAD_PATHS[stage.routeRoad];
          const pos = pointAlong(path, Math.max(60, stage.fromS - 500 - i * 160), -26);
          const car = makeCar(CAR_MODELS[0], pos.x, pos.y, pos.angle, '#2e2a26');
          car.driver = 'mission-hostile';
          car.name = 'Brava de los Hermanos';
          G.cars.push(car);
          rt['rivalCar' + i] = car;
        }
      }
      for (let i = 0; i < 2; i += 1) {
        const car = rt['rivalCar' + i];
        if (car && !car.wrecked) {
          const side = truck.angle + Math.PI / 2;
          driveToward(G, car, truck.x + Math.cos(side) * 26, truck.y + Math.sin(side) * 26, dt, 1.12);
        }
      }
      if (truck.route && truck.route.s >= stage.toS) stageDone(G);
      break;
    }
    case 'ferry': {
      // Villagers board when the player's boat comes alongside their dock.
      for (const ped of rt.spawned) {
        if (ped.remove) continue;
        if (p.mode === 'boat' && dist(p.x, p.y, ped.x, ped.y) < 90) {
          ped.remove = true;
          rt.aboard += 1;
          rt.collected = rt.aboard;
          G.audio.pickup();
          G.floaters.push({ x: ped.x, y: ped.y - 24, text: 'A BORDO', life: 1.2, maxLife: 1.2, colour: '#9fe8b0', size: 15 });
        }
      }
      if (rt.aboard >= stage.points.length
        && p.mode === 'boat' && dist(p.x, p.y, stage.deliver[0], stage.deliver[1]) < 130) {
        stageDone(G);
      }
      break;
    }
    default:
      break;
  }
}

/** Mission cars drive their road like traffic, but slower and with somewhere to be. */
function driveMissionCar(G, car, dt) {
  const route = car.route;
  if (!route) return;
  const aheadS = route.s + route.dir * 130;
  const pos = pointAlong(route.path, aheadS, route.dir > 0 ? 26 : -26);
  const toPos = Math.atan2(pos.y - car.y, pos.x - car.x);
  let delta = toPos - car.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, delta * 2.4));
  const throttle = Math.abs(delta) > 2.2 ? -0.6 : route.cruise + 0.3;
  driveCar(G, car, throttle, steer, dt);
  route.s += route.dir * car.speed * dt;
  if (route.s < 40) route.s = 40;
  if (route.s > route.path.total - 40) route.s = route.path.total - 40;
}

/** Where the HUD arrow and minimap should point right now, or null between jobs. */
export function marker(G) {
  const M = G.missions;
  const active = M.active;
  if (!active) {
    // Between jobs the marker rests on Mamá Yara's porch.
    return { x: 760, y: 3906, label: 'Mamá Yara' };
  }
  const stage = active.mission.stages[active.stageIdx];
  const rt = active.rt;
  switch (stage.type) {
    case 'pickup': {
      let best = null;
      let bestD = Infinity;
      for (const pk of G.pickups) {
        if (!pk.mission) continue;
        const d = dist(G.player.x, G.player.y, pk.x, pk.y);
        if (d < bestD) { bestD = d; best = pk; }
      }
      return best ? { x: best.x, y: best.y, label: stage.text } : null;
    }
    case 'course':
    case 'race': {
      const t = stage.points[rt?.checkpoint ?? 0] ?? stage.points[stage.points.length - 1];
      return { x: t[0], y: t[1], label: stage.text };
    }
    case 'tail':
      return rt?.targetCar ? { x: rt.targetCar.x, y: rt.targetCar.y, label: stage.text } : null;
    case 'escort':
      return rt?.truck ? { x: rt.truck.x, y: rt.truck.y, label: stage.text } : null;
    case 'ferry': {
      if ((rt?.aboard ?? 0) >= stage.points.length) return { x: stage.deliver[0], y: stage.deliver[1], label: 'Entrégalos en Puerto Barro' };
      const ped = rt?.spawned.find((pd) => !pd.remove);
      return ped ? { x: ped.x, y: ped.y, label: stage.text } : null;
    }
    case 'steal': {
      const car = G.cars.find((c) => c.exportId === stage.exportId);
      return car ? { x: car.x, y: car.y, label: stage.text } : null;
    }
    case 'lose':
      return null;
    default:
      return stage.x !== undefined ? { x: stage.x, y: stage.y, label: stage.text } : null;
  }
}

/** The three lines the mission panel is made of, plus a 0..1 stage progress. */
export function hudData(G) {
  const M = G.missions;
  const active = M.active;
  if (!active) {
    if (M.next >= MISSIONS.length) {
      return { job: 'TEMPORADA COMPLETA', stage: 'La laguna es tuya, Rayo.', next: 'Libre: exportaciones, garitas y ron', progress: 1 };
    }
    const m = MISSIONS[M.next];
    return { job: `JOB ${M.next + 1}/${MISSIONS.length}`, stage: m.title, next: 'Ve con ' + m.giver, progress: 0 };
  }
  const stage = active.mission.stages[active.stageIdx];
  const rt = active.rt;
  let progress = 0;
  if (stage.type === 'pickup' || stage.type === 'ferry') progress = (rt?.collected ?? 0) / (stage.count ?? stage.points.length);
  else if (stage.type === 'tail') progress = (rt?.progress ?? 0) / stage.duration;
  else if (stage.type === 'course' || stage.type === 'race') progress = (rt?.checkpoint ?? 0) / stage.points.length;
  else if (stage.type === 'defend') progress = (rt?.wave ?? 0) / stage.waves.length;
  else if (stage.type === 'escort' && rt?.truck?.route) progress = (rt.truck.route.s - stage.fromS) / (stage.toS - stage.fromS);
  else if (stage.type === 'goto' || stage.type === 'chase') progress = 0.5;
  let stageText = stage.text;
  if (rt?.t !== null && rt?.t !== undefined) stageText += ` · ${Math.max(0, Math.ceil(rt.t))}s`;
  if (stage.type === 'pickup') stageText += ` · ${rt?.collected ?? 0}/${stage.count}`;
  return {
    job: `JOB ${active.idx + 1}/${MISSIONS.length}`,
    stage: stageText,
    next: stage.next,
    progress: Math.max(0, Math.min(1, progress)),
  };
}
