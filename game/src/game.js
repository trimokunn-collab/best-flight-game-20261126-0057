// SKY RUSH — Island Courier: the game itself. Missions, scoring, collisions,
// parcels, particles, and the state machine (menu → briefing → flying →
// debrief / crash). The renderer draws; this file decides.

import { MISSIONS, PALETTES, RUNWAYS, SCORE, STAR_THRESHOLDS, FLIGHT, LANDING } from './config.js';
import { buildWorld } from './world.js';
import { createPlane } from './plane.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('skyrush_best') || '{}');
  } catch (e) { return {}; }
}

export function createGame(canvas, els) {
  const renderer = createRenderer(canvas);
  const input = createInput(canvas);
  const audio = createAudio();
  const best = loadBest();

  const game = {
    state: 'menu',
    missionIndex: 0,
    world: null,
    plane: null,
    throttle: 0,          // game-owned throttle 0..1 (input only nudges it)
    score: 0,
    ringsPassed: 0,
    dropsDone: 0,
    parcelsLeft: 0,
    parcels: [],
    particles: [],
    time: 0,
    flightTime: 0,
    flash: 0,
    shake: 0,
    lightningTimer: 5,
    fuelWarned: false,
    breakdown: null,
    crashReason: '',
    nextTarget: null,
    seed: 7,
  };

  function palette() {
    return PALETTES[game.world ? game.world.paletteKey : 'morning'];
  }

  function setState(next) {
    game.state = next;
    if (els.onState) els.onState(next, game);
  }

  function showToast(text, ms) {
    if (!els.toast) return;
    els.toast.textContent = text;
    els.toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.add('hidden'), ms || 2400);
  }

  function setObjective(text) {
    if (els.objective) els.objective.textContent = text;
  }

  function updateHud() {
    const hud = game.plane.hud(game.world);
    if (els.score) els.score.textContent = String(game.score);
    if (els.alt) els.alt.textContent = String(hud.alt);
    if (els.spd) els.spd.textContent = String(hud.spd);
    if (els.hdg) els.hdg.textContent = String(hud.hdg).padStart(3, '0') + '°';
    if (els.hdgDir) {
      els.hdgDir.textContent = hud.hdg >= 45 && hud.hdg < 135 ? 'E'
        : hud.hdg >= 135 && hud.hdg < 225 ? 'S'
        : hud.hdg >= 225 && hud.hdg < 315 ? 'W' : 'N';
    }
    if (els.thr) els.thr.textContent = hud.thr + '%';
    if (els.fuel) {
      els.fuel.textContent = String(hud.fuel);
      const cell = els.fuel.closest ? els.fuel.closest('.hud-cell') : null;
      if (cell) cell.classList.toggle('crit', hud.fuel < 20);
    }
    if (els.mission) {
      const m = game.world.mission;
      els.mission.textContent = m.name + ' · ◆' + game.ringsPassed + '/' + m.rings.length
        + (m.dropZones.length ? ' · ▣' + game.dropsDone + '/' + m.dropZones.length : '');
    }
    if (els.warn) els.warn.classList.toggle('hidden', !game.plane.stalled || game.state !== 'flying');
  }

  function selectMission(i) {
    game.missionIndex = i;
    const mission = MISSIONS[i];
    game.seed = mission.seed;
    game.world = buildWorld(mission, game.seed);
    game.plane = createPlane(game.world, 'A');
    game.score = 0;
    game.ringsPassed = 0;
    game.dropsDone = 0;
    game.parcelsLeft = mission.dropZones.length;
    game._parcelPoints = 0;
    game.parcels = [];
    game.particles = [];
    game.time = 0;
    game.flightTime = 0;
    game.flash = 0;
    game.shake = 0;
    game.breakdown = null;
    game.crashReason = '';
    renderer.cam.x = game.plane.x;
    renderer.cam.y = 260;
    renderer.cam.anchorX = canvas.width * 0.36;
    setObjective(mission.desc);
    updateHud();
    setState('briefing');
  }

  function startFlight() {
    if (!game.world) selectMission(game.missionIndex);
    game.world.resetCourse();
    game.plane.reset('A');
    game.score = 0;
    game.ringsPassed = 0;
    game.dropsDone = 0;
    game.parcelsLeft = game.world.mission.dropZones.length;
    game._parcelPoints = 0;
    game.parcels = [];
    game.particles = [];
    game.flightTime = 0;
    game.fuelWarned = false;
    game.breakdown = null;
    game.crashReason = '';
    game.throttle = 0;
    renderer.cam.x = game.plane.x;
    renderer.cam.y = 220;
    setObjective(game.world.mission.desc);
    updateHud();
    setState('flying');
    showToast('Throttle up — hold D, pull back on W to climb', 3200);
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * (speed || 140);
      game.particles.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.6 + Math.random() * 0.5, maxLife: 1.1,
        size: 2 + Math.random() * 4, color,
      });
    }
  }

  function landingScore(td) {
    const sinkQ = 1 - clamp(td.sink / LANDING.maxSink, 0, 1) * 0.5;
    const spdQ = 1 - clamp(Math.abs(td.speed * 0.5 - 160) / 160, 0, 1) * 0.25;
    const ctrQ = 1 - clamp(td.center / 300, 0, 1) * 0.25;
    const q = clamp(sinkQ * 0.6 + spdQ * 0.2 + ctrQ * 0.2, 0, 1);
    return SCORE.landingBase + Math.round(SCORE.landingQuality * q);
  }

  function finishFlight(landed) {
    const m = game.world.mission;
    const parcelPoints = game._parcelPoints || 0;
    const fuelBonus = Math.round(game.plane.fuel * SCORE.fuelBonusPerUnit);
    const timeBonus = Math.max(0, Math.round((m.parTime - game.flightTime) * SCORE.timeBonusPerSec));
    const land = landed && game.plane.touchdown ? landingScore(game.plane.touchdown) : 0;
    const total = game.score + land + timeBonus + fuelBonus;
    const stars = total >= STAR_THRESHOLDS[2] ? 3 : total >= STAR_THRESHOLDS[1] ? 2 : total >= STAR_THRESHOLDS[0] ? 1 : 0;
    game.breakdown = {
      rings: game.score - parcelPoints,
      parcels: parcelPoints,
      landing: land,
      time: timeBonus,
      fuel: fuelBonus,
      total, stars,
      ringsDone: game.ringsPassed, ringsTotal: game.world.rings.length,
      dropsDone: game.dropsDone, dropsTotal: game.world.dropZones.length,
      flightTime: game.flightTime,
      landed,
    };
    const key = m.id;
    if (total > (best[key] || 0)) {
      best[key] = total;
      try { localStorage.setItem('skyrush_best', JSON.stringify(best)); } catch (e) { /* private mode */ }
    }
    game.breakdown.best = best[key];
    game.breakdown.isBest = total >= best[key];
    audio.setEngine(0, 0, false);
    audio.fanfare();
    setState('complete');
  }

  function crash(reason) {
    game.crashReason = reason;
    burst(game.plane.x, game.plane.y, '#ff6b35', 42, 260);
    burst(game.plane.x, game.plane.y, '#3a3f47', 24, 160);
    burst(game.plane.x, game.plane.y, '#ffd25e', 16, 200);
    game.shake = 16;
    audio.setEngine(0, 0, false);
    audio.crash();
    setState('crashed');
  }

  function dropParcel() {
    if (game.state !== 'flying' || !game.plane.airborne || game.parcelsLeft <= 0) return;
    game.parcelsLeft -= 1;
    game.parcels.push({
      x: game.plane.x,
      y: game.plane.y,
      vx: game.plane.dir * game.plane.speed * 0.85,
      vy: 0,
      landed: false,
      scored: false,
    });
    audio.parcel();
    showToast('Parcel away! (' + game.parcelsLeft + ' left)', 1600);
    updateHud();
  }

  function turnAround() {
    if (game.state !== 'flying' || !game.plane.airborne || game.plane.turning > 0) return;
    if (game.plane.speed < 180) {
      showToast('Too slow to turn — keep speed above 90 kt', 2200);
      return;
    }
    game.plane.turning = 0.0001;
    game.plane.turnFrom = game.plane.heading;
    audio.click();
    showToast('Banking around…', 1600);
  }

  function checkCollisions(dt) {
    const plane = game.plane;
    const world = game.world;
    // Rings.
    for (const ring of world.rings) {
      if (ring.passed) continue;
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      if (dx * dx + dy * dy < ring.r * ring.r) {
        ring.passed = true;
        game.ringsPassed += 1;
        game.score += SCORE.ring;
        burst(ring.x, ring.y, '#ffd25e', 16, 160);
        audio.ring();
        showToast('Ring ' + (ring.index + 1) + ' — +' + SCORE.ring + ' pts', 1400);
        refreshObjective();
        updateHud();
      }
    }
    // Fuel cans.
    for (const can of world.fuelCans) {
      if (can.taken) continue;
      const dx = plane.x - can.x;
      const dy = plane.y - can.y;
      if (dx * dx + dy * dy < 42 * 42) {
        can.taken = true;
        plane.fuel = Math.min(100, plane.fuel + 35);
        burst(can.x, can.y, '#ff8c42', 12, 120);
        audio.parcel();
        showToast('Fuel +35', 1400);
        updateHud();
      }
    }
    // Birds.
    for (const b of world.birds) {
      if (!b.alive) continue;
      const dx = plane.x - b.x;
      const dy = plane.y - b.y;
      if (dx * dx + dy * dy < 30 * 30) {
        b.alive = false;
        plane.hull = Math.max(0, plane.hull - FLIGHT.birdDamage);
        burst(b.x, b.y, '#ffffff', 10, 90);
        game.shake = Math.max(game.shake, 8);
        audio.touchdown();
        showToast('Bird strike! Hull −' + FLIGHT.birdDamage, 1800);
        if (plane.hull <= 0) crash('A bird strike finished her off.');
      }
    }
    // Storm cells: hull drain + lightning.
    for (const cell of world.stormCells) {
      const dx = (plane.x - cell.x) / cell.r;
      const dy = (plane.y - cell.y) / (cell.r * 0.55);
      if (dx * dx + dy * dy < 1) {
        plane.hull = Math.max(0, plane.hull - FLIGHT.stormDamage * dt);
        game.shake = Math.max(game.shake, 3);
        game.lightningTimer -= dt;
        if (game.lightningTimer <= 0) {
          game.lightningTimer = 4 + Math.random() * 5;
          game.flash = 1;
          plane.hull = Math.max(0, plane.hull - 5);
          audio.stall();
          showToast('Lightning! Hull −5', 1600);
        }
        if (plane.hull <= 0) crash('The storm tore her apart.');
      }
    }
    // Low fuel warning.
    if (plane.fuel < 25 && !game.fuelWarned) {
      game.fuelWarned = true;
      showToast('LOW FUEL — find a fuel can or land', 2600);
    }
    if (plane.fuel >= 25) game.fuelWarned = false;
  }

  function refreshObjective() {
    const m = game.world.mission;
    const ringsLeft = m.rings.length - game.ringsPassed;
    const dropsLeft = m.dropZones.length - game.dropsDone;
    if (m.dropZones.length && dropsLeft === 0 && ringsLeft === 0) {
      setObjective('All parcels delivered — land on Runway 27');
    } else if (m.dropZones.length && dropsLeft > 0) {
      setObjective('Drop parcels on ' + dropsLeft + ' more village' + (dropsLeft === 1 ? '' : 's') + ', then land Runway 27');
    } else if (ringsLeft === 0) {
      setObjective(m.returnLeg ? 'All rings flown — turn around and land Runway 09' : 'All rings flown — land on Runway 27');
    } else {
      setObjective('Fly ring ' + (game.ringsPassed + 1) + ' of ' + m.rings.length + (m.returnLeg ? ' — storm ahead, watch the fuel' : ''));
    }
  }

  function nextTarget() {
    const m = game.world.mission;
    for (const ring of game.world.rings) {
      if (!ring.passed) return { x: ring.x, y: ring.y, label: 'RING ' + (ring.index + 1) };
    }
    for (const z of game.world.dropZones) {
      if (!z.done) return { x: z.x, y: game.world.terrainHeight(z.x) + 60, label: 'DROP ZONE' };
    }
    const dest = m.returnLeg ? RUNWAYS.A : RUNWAYS.B;
    return { x: (dest.x0 + dest.x1) / 2, y: dest.y + 40, label: 'RUNWAY ' + dest.label };
  }

  // Where would a parcel dropped right now land? Same physics as
  // updateParcels, stepped forward — the marker on the ground that lets
  // the player judge the drop instead of guessing the lead.
  function predictDrop() {
    const plane = game.plane;
    const world = game.world;
    if (game.state !== 'flying' || !plane.airborne || game.parcelsLeft <= 0) return null;
    let x = plane.x;
    let y = plane.y;
    const vx = plane.dir * plane.speed * 0.85;
    let vy = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 600; i++) {
      vy -= 60 * dt;
      x += (vx - (world.wind + world.gustValue) * 0.5) * dt;
      y += vy * dt;
      if (y <= world.terrainHeight(x)) return { x, y: world.terrainHeight(x) };
    }
    return null;
  }

  function updateParcels(dt) {
    const world = game.world;
    for (const p of game.parcels) {
      if (p.landed) continue;
      p.vy -= 60 * dt;               // gravity pulls the parcel down
      p.x += (p.vx - (world.wind + world.gustValue) * 0.5) * dt;
      p.y += p.vy * dt;
      const ground = world.terrainHeight(p.x);
      if (p.y <= ground) {
        p.y = ground;
        p.landed = true;
        let bestZone = null;
        let bestDist = Infinity;
        for (const z of world.dropZones) {
          if (z.done) continue;
          const d = Math.abs(p.x - z.x);
          if (d < bestDist) { bestDist = d; bestZone = z; }
        }
        if (bestZone && bestDist <= bestZone.r) {
          const pts = Math.max(25, Math.round(SCORE.parcelMax * (1 - bestDist / bestZone.r)));
          bestZone.done = true;
          bestZone.best = pts;
          game.dropsDone += 1;
          game.score += pts;
          game._parcelPoints = (game._parcelPoints || 0) + pts;
          burst(p.x, p.y + 20, '#ffd25e', 14, 120);
          audio.parcelGood();
          showToast('Parcel delivered! +' + pts + ' pts', 1800);
        } else {
          burst(p.x, p.y + 10, '#b07a3e', 8, 80);
          showToast('Parcel missed the drop zone', 1800);
        }
        refreshObjective();
        updateHud();
      }
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) { game.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - dt * 1.2);
      p.vy *= (1 - dt * 1.2);
      p.vy -= 12 * dt;
    }
  }

  function spawnExhaust(dt) {
    const plane = game.plane;
    if (plane.throttle < 0.3 || plane.crashed) return;
    if (Math.random() > dt * 22) return;
    game.particles.push({
      x: plane.x - plane.dir * 34,
      y: plane.y - 2 + (Math.random() - 0.5) * 6,
      vx: -plane.dir * 30 + (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 14,
      life: 0.45, maxLife: 0.45,
      size: 2.5 + Math.random() * 2,
      color: plane.hull < 55 ? 'rgba(70,70,70,0.7)' : 'rgba(255,255,255,0.55)',
    });
  }

  function toggleMute() {
    const m = !audio.isMuted();
    audio.setMuted(m);
    showToast(m ? 'Sound off' : 'Sound on', 1200);
    return m;
  }

  function pauseGame() {
    if (game.state === 'flying') {
      setState('paused');
      audio.setEngine(0, 0, false);
    }
  }

  function resumeGame() {
    if (game.state === 'paused') setState('flying');
  }

  function step(dt) {
    game.time += dt;
    // Edge-triggered presses, consumed once per frame in every state.
    const pressed = input.consume();
    if (pressed.any) audio.unlock();
    if (pressed.mute) toggleMute();
    if (pressed.pause) {
      if (game.state === 'flying') pauseGame();
      else if (game.state === 'paused') resumeGame();
    }
    if (pressed.restart) {
      if (game.state === 'flying' || game.state === 'paused' || game.state === 'crashed' || game.state === 'complete') {
        startFlight();
      }
    }
    if (pressed.confirm) {
      if (game.state === 'briefing') startFlight();
      else if (game.state === 'complete' || game.state === 'crashed') startFlight();
      else if (game.state === 'menu') selectMission(game.missionIndex);
    }
    if (game.state === 'flying') {
      if (pressed.drop) dropParcel();
      if (pressed.turn) turnAround();
      game.flightTime += dt;
      // Throttle: keys nudge it, the wheel nudges it, it stays where left.
      game.throttle = clamp(game.throttle + input.throttleKey * 1.2 * dt + pressed.wheel, 0, 1);
      const events = game.plane.step(dt, input.pitch, game.throttle, game.world);
      for (const ev of events) {
        if (ev.type === 'liftoff') {
          showToast('Airborne! Gear up, flaps up', 1800);
          audio.click();
        } else if (ev.type === 'hard-landing') {
          game.shake = Math.max(game.shake, 10);
          burst(game.plane.x, game.plane.y, '#cfd6de', 12, 100);
          audio.touchdown();
          showToast('Hard landing! Hull −18', 1800);
        } else if (ev.type === 'landed') {
          audio.touchdown();
          finishFlight(true);
        } else if (ev.type === 'crashed') {
          crash(ev.reason);
        } else if (ev.type === 'turned') {
          showToast('Now heading ' + ev.heading + '° — fly her home', 2000);
        }
      }
      if (game.state === 'flying') {
        checkCollisions(dt);
        updateParcels(dt);
        spawnExhaust(dt);
        game.predictedDrop = predictDrop();
        // Stall warning beep.
        if (game.plane.stalled && Math.floor(game.time * 2) !== Math.floor((game.time - dt) * 2)) {
          audio.stall();
        }
        game.nextTarget = nextTarget();
        updateHud();
      }
      audio.setEngine(game.throttle, game.plane.speed / FLIGHT.maxSpeed, game.plane.airborne);
    }
    // Particles, flash and shake decay in every state.
    updateParticles(dt);
    game.flash = Math.max(0, game.flash - dt * 2.2);
    game.shake = Math.max(0, game.shake - dt * 26);
    renderer.state.shake = game.shake;
    if (game.plane && game.plane.stalled) renderer.state.shake = Math.max(renderer.state.shake, 1.2);
  }

  function renderFrame(dt) {
    const scene = {
      world: game.world,
      plane: game.plane,
      palette: palette(),
      mission: game.world ? game.world.mission : MISSIONS[0],
      time: game.time,
      dt,
      parcels: game.parcels,
      particles: game.particles,
      predictedDrop: game.predictedDrop || null,
      flash: game.flash,
      nextTarget: game.state === 'flying' ? game.nextTarget : null,
      showPanel: game.state === 'flying' || game.state === 'paused',
    };
    renderer.render(scene);
  }

  let rafId = 0;
  let lastT = 0;
  function loop(t) {
    const dt = Math.min(0.033, Math.max(0.001, (t - lastT) / 1000 || 0.016));
    lastT = t;
    step(dt);
    renderFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (!game.world) selectMission(0);
    // Menu backdrop: plane parked on the home runway.
    if (game.state === 'briefing') setState('menu');
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // ---- deterministic screenshot states (?shot=menu|fly|land|complete) ----
  function applyShot(shot, seed) {
    const s = seed || 7;
    if (shot === 'menu') {
      selectMission(0);
      setState('menu');
      return;
    }
    if (shot === 'fly') {
      selectMission(0);
      game.world.rings[0].passed = true;
      game.world.rings[1].passed = true;
      game.ringsPassed = 2;
      game.score = 200;
      game.plane.x = 3950;
      game.plane.y = 560;
      game.plane.speed = 330;
      game.plane.throttle = 0.75;
      game.throttle = 0.75;
      game.plane.pitch = 0;
      game.plane.airborne = true;
      game.plane.fuel = 78;
      game.plane.hull = 100;
      renderer.cam.x = 3950;
      renderer.cam.y = 560;
      setObjective('Fly ring 3 of 6');
      updateHud();
      setState('flying');
      return;
    }
    if (shot === 'land') {
      selectMission(0);
      game.world.rings.forEach((r) => { r.passed = true; });
      game.ringsPassed = 6;
      game.score = 600;
      game.plane.x = 10600;
      game.plane.y = 190;
      game.plane.speed = 200;
      game.plane.throttle = 0.3;
      game.throttle = 0.3;
      game.plane.pitch = -3;
      game.plane.airborne = true;
      game.plane.fuel = 41;
      game.plane.hull = 100;
      renderer.cam.x = 10600;
      renderer.cam.y = 190;
      setObjective('All rings flown — land on Runway 27');
      updateHud();
      setState('flying');
      return;
    }
    if (shot === 'complete') {
      selectMission(0);
      game.world.rings.forEach((r) => { r.passed = true; });
      game.ringsPassed = 6;
      game.score = 600;
      game.plane.x = 11350;
      game.plane.y = RUNWAYS.B.y;
      game.plane.speed = 0;
      game.plane.throttle = 0;
      game.plane.fuel = 38;
      game.plane.hull = 100;
      game.plane.landed = true;
      game.plane.touchdown = { sink: 34, speed: 150, center: 42 };
      game.flightTime = 187;
      renderer.cam.x = 11350;
      renderer.cam.y = 240;
      finishFlight(true);
      return;
    }
  }

  return {
    game, renderer, input, audio,
    selectMission, startFlight, dropParcel, turnAround,
    palette, showToast, setObjective, updateHud, refreshObjective, nextTarget,
    finishFlight, crash, burst, checkCollisions, setState,
    start, stop, applyShot,
    toMenu() { selectMission(game.missionIndex); setState('menu'); },
    pause() { pauseGame(); },
    resume() { resumeGame(); },
    toggleMute,
    best,
  };
}
