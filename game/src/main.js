// SKY RUSH — Island Courier: DOM wiring. Overlays, mission cards, the
// debrief sheet and the deterministic screenshot states
// (?shot=menu|fly|land|complete). The canvas game itself lives in game.js.

import { MISSIONS } from './config.js';
import { createGame } from './game.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
}

const els = {
  toast: $('toast'),
  objective: $('objective'),
  score: $('hud-score'),
  alt: $('hud-alt'),
  spd: $('hud-spd'),
  hdg: $('hud-hdg'),
  hdgDir: $('hud-hdg-dir'),
  thr: $('hud-thr'),
  fuel: $('hud-fuel'),
  mission: $('hud-mission'),
  warn: $('warn'),
  onState: null,
};

const api = createGame(canvas, els);

// ---- overlays ----
const overlays = {
  menu: $('menu'),
  briefing: $('briefing'),
  paused: $('pause-card'),
  complete: $('debrief'),
  crashed: $('crash-card'),
};

function showOnly(name) {
  for (const key of Object.keys(overlays)) {
    overlays[key].classList.toggle('hidden', key !== name);
  }
  const inFlight = name === null || name === 'paused';
  $('hud-top').classList.toggle('hidden', !inFlight);
  $('objective').classList.toggle('hidden', !inFlight);
  $('touch-controls').classList.toggle('hidden', !(IS_TOUCH && inFlight));
  $('warn').classList.add('hidden');
}

function factRow(label, value) {
  return '<div class="row"><span>' + label + '</span><span>' + value + '</span></div>';
}

function fillBriefing(mission, index) {
  $('brief-title').textContent = 'MISSION ' + (index + 1) + ' — ' + mission.name;
  $('brief-text').textContent = mission.desc;
  const best = api.best[mission.id] || 0;
  const course = [];
  if (mission.rings.length) course.push(mission.rings.length + ' rings');
  if (mission.dropZones.length) course.push(mission.dropZones.length + ' drop zones');
  if (mission.fuelCans.length) course.push(mission.fuelCans.length + ' fuel cans');
  if (mission.stormCells.length) course.push(mission.stormCells.length + ' storm cells');
  $('brief-facts').innerHTML =
    factRow('Course', course.join(' · ') || 'Free flight') +
    factRow('Wind', mission.wind + ' kt' + (mission.gust ? ' · gusts ' + mission.gust : '')) +
    factRow('Par time', fmtTime(mission.parTime)) +
    factRow('Land at', 'Runway ' + (mission.returnLeg ? '09 (home)' : '27')) +
    factRow('Best score', best > 0 ? best + ' pts' : 'Not flown yet');
}

function fillDebrief(b) {
  $('debrief-stars').textContent = stars(b.stars);
  $('debrief-title').textContent = b.landed
    ? (b.stars === 3 ? 'PERFECT DELIVERY!' : 'MISSION COMPLETE!')
    : 'LANDED SHORT';
  $('debrief-lines').innerHTML =
    factRow('Rings', b.ringsDone + '/' + b.ringsTotal + ' — ' + b.rings + ' pts') +
    factRow('Parcels', b.dropsDone + '/' + b.dropsTotal + ' — ' + b.parcels + ' pts') +
    factRow('Landing', b.landed ? b.landing + ' pts' : 'No landing') +
    factRow('Time bonus', '+' + b.time + ' pts (' + fmtTime(b.flightTime) + ')') +
    factRow('Fuel bonus', '+' + b.fuel + ' pts');
  $('debrief-total').textContent = 'TOTAL ' + b.total + ' PTS'
    + (b.isBest && b.total > 0 ? ' — NEW BEST!' : ' · Best ' + b.best + ' pts');
}

function fillCrash(reason) {
  $('crash-reason').textContent = reason;
}

els.onState = (state, g) => {
  const status = $('status');
  if (state === 'menu') {
    showOnly('menu');
    status.textContent = 'Menu. Pick a mission.';
  } else if (state === 'briefing') {
    fillBriefing(MISSIONS[g.missionIndex], g.missionIndex);
    showOnly('briefing');
    status.textContent = 'Briefing: ' + MISSIONS[g.missionIndex].name;
  } else if (state === 'flying') {
    showOnly(null);
    status.textContent = 'Flying ' + MISSIONS[g.missionIndex].name;
  } else if (state === 'paused') {
    showOnly('paused');
    status.textContent = 'Paused.';
  } else if (state === 'complete') {
    fillDebrief(g.breakdown);
    showOnly('complete');
    status.textContent = 'Mission complete. ' + g.breakdown.total + ' points.';
  } else if (state === 'crashed') {
    fillCrash(g.crashReason);
    showOnly('crashed');
    status.textContent = 'Crashed. ' + g.crashReason;
  }
};

// ---- menu mission cards (styled by .mission in style.css) ----
const list = $('mission-list');
MISSIONS.forEach((m, i) => {
  const card = document.createElement('button');
  card.className = 'mission';
  card.type = 'button';
  const best = api.best[m.id] || 0;
  const bits = [];
  if (m.rings.length) bits.push(m.rings.length + ' rings');
  if (m.dropZones.length) bits.push(m.dropZones.length + ' drops');
  if (m.returnLeg) bits.push('return leg');
  card.innerHTML =
    '<span class="num">' + (i + 1) + '</span>' +
    '<span class="body">' +
    '<span class="name">' + m.name + '</span>' +
    '<span class="desc">' + m.tag + ' · ' + bits.join(' · ') + ' · par ' + fmtTime(m.parTime) + '</span>' +
    '<span class="best">' + (best > 0 ? 'Best ' + best + ' pts' : 'Not flown yet') + '</span>' +
    '</span><span class="go">›</span>';
  card.addEventListener('click', () => {
    api.audio.unlock();
    api.audio.click();
    api.selectMission(i);
  });
  list.appendChild(card);
});

// ---- buttons ----
$('btn-fly').addEventListener('click', () => { api.audio.unlock(); api.startFlight(); });
$('btn-back').addEventListener('click', () => api.toMenu());
$('btn-resume').addEventListener('click', () => api.resume());
$('btn-quit').addEventListener('click', () => api.toMenu());
$('btn-next').addEventListener('click', () => {
  api.selectMission((api.game.missionIndex + 1) % MISSIONS.length);
});
$('btn-retry').addEventListener('click', () => api.startFlight());
$('btn-menu2').addEventListener('click', () => api.toMenu());
$('btn-retry2').addEventListener('click', () => api.startFlight());
$('btn-menu3').addEventListener('click', () => api.toMenu());
$('btn-pause').addEventListener('click', () => api.pause());
$('btn-sound').addEventListener('click', (e) => {
  const muted = api.toggleMute();
  e.currentTarget.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
});
// NOTE: btn-drop / btn-turn / btn-thr-up / btn-thr-down are wired inside
// input.js (they set edge-triggered presses the game consumes each frame);
// wiring them here too would fire every action twice.

// Prevent the canvas from swallowing long-press gestures.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- boot ----
api.start();

// Deterministic screenshot states for the dossier.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = parseInt(params.get('seed') || '7', 10);
  api.applyShot(shot, seed);
}

// Test handle: the harness drives the game through this.
window.__skyrush = api;
