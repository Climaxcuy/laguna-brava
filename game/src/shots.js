// Screenshot stage setups (?shot=1..4). HUD stays exactly as in gameplay.
export function setupShot(G, n) {
  G.shotMode = n; G.started = true;
  document.getElementById('titleScreen').style.display = 'none';
  if (n === 1) {
    // Golden-hour interstate chase, low close cam, GARZA + named units + trucks + roadblock
    const c = G.traffic.charger; G.enterCar(c, true);
    c.mesh.position.set(0, 0, -40); c.angle = Math.PI / 2; c.speed = 30; G.car.speed = 30;
    G.playerPos.set(0, 0, -40); G.wanted = 4; G.wantedVisible = true;
    G.police.units[0].mesh.position.set(-16, 0, -34); G.police.units[1].mesh.position.set(-26, 0, -48);
    G.police.units[2].mesh.position.set(38, 0, -40); G.police.units[2].mesh.rotation.y = -Math.PI / 2; // roadblock ahead
    G.police.units[3].mesh.position.set(-10, 0, -52);
    G.police.heli.mesh.position.set(-24, 26, -66);
    G.feed('🚨 BRAVO-5 PURSUIT · BRAVO-9 RAMMING · SIERRA-2 ROADBLOCK ahead!');
    G.feed('🚁 GARZA air unit overhead — spotlight hot');
    G.showDialogue('🧔🏽', 'Tío Braulio Fuentes', 'Swamp Patriarch', 'Floor it, mijo! The Charger flies — don’t let BRAVO-5 box you in!');
    G.camMode = 'chaseLow';
  }
  if (n === 2) {
    // Night on-foot combat in Villa Ceniza
    G.night = true; G.playerPos.set(-296, 0, -242); G.playerAngle = 0.6; G.mode = 'foot';
    G.missionIndex = 2; G.missions.reset();
    G.firingHeld = true; G.wanted = 2;
    G.police.units[0].mesh.position.set(-282, 0, -228);
    G.combat.damageNumber(new THREE.Vector3(-290, 1, -235), 34);
    G.combat.damageNumber(new THREE.Vector3(-286, 1, -230), 27);
    G.showDialogue('👩🏽‍🔧', 'Lupe', 'Wheel Witch', 'Plaza guards, three of them — F to fire, watch the numbers fly!');
  }
  if (n === 3) {
    // Airboat mid-slide in a swamp channel, spray flying, objective printout
    const B = G.boat; B.mesh.position.set(330, 0.2, 190); B.angle = Math.PI + 0.35; B.vx = 3.5; B.vz = -11;
    G.boardBoat();
    G.printout('OBJECTIVE: Slide the channel to the drop buoy — 126 m · FAN BOOST READY [Z]');
    G.feed('🛶 Airboat “Fan Dancer” planing — mud banks both sides');
    G.camMode = 'boatChase';
  }
  if (n === 4) {
    // Map + stats screen with big numbers
    G.stats.missionsDone = 3; G.stuntsDone = 5; G.exportsDone = 2; G.jugs = 6; G.respect = 148; G.cash = 6850; G.stats.earned = 9400;
    document.getElementById('mapScreen').style.display = 'block';
    const ss = document.getElementById('statsScreen'); ss.style.display = 'block'; ss.style.background = 'rgba(8,6,14,.86)';
    G.renderStats(); G.drawMapNow = true;
  }
}
