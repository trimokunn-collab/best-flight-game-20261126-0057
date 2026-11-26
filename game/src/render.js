// SKY RUSH — Island Courier: canvas drawing. One flat-vector look per
// mission, a chase camera that never fights the pilot, and a lit instrument
// panel along the bottom of the screen.

import { CANVAS_W, CANVAS_H, PALETTES, RUNWAYS, WORLD_LENGTH } from './config.js';

const DEG = Math.PI / 180;
const PANEL_H = 108;                 // instrument panel height
const VIEW_H = CANVAS_H - PANEL_H;   // sky + terrain area

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cam = { x: 600, y: 200, anchorX: CANVAS_W * 0.36, anchorY: VIEW_H * 0.55 };
  const state = { cam, shake: 0, time: 0 };

  function worldToScreen(wx, wy) {
    return {
      x: wx - cam.x + cam.anchorX,
      y: cam.anchorY - (wy - cam.y),
    };
  }

  function updateCamera(plane, dt) {
    const targetX = plane.x;
    const targetY = plane.y;
    const anchorTarget = plane.dir > 0 ? CANVAS_W * 0.36 : CANVAS_W * 0.64;
    cam.anchorX += (anchorTarget - cam.anchorX) * Math.min(1, dt * 2.2);
    const k = 1 - Math.exp(-dt * 3.2);
    cam.x += (targetX - cam.x) * k;
    cam.y += (targetY - cam.y) * k;
    cam.y = Math.max(60, Math.min(700, cam.y));
  }

  function drawSky(scene) {
    const p = scene.palette;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.55, p.skyMid);
    g.addColorStop(1, p.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, VIEW_H);

    // Sun or moon, fixed in the sky's far layer.
    const sunPos = worldToScreen(cam.x + 2600, 760);
    const sx = Math.max(80, Math.min(CANVAS_W - 80, sunPos.x));
    const sy = 92;
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 130);
    glow.addColorStop(0, p.sunGlow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.fillStyle = p.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, p.night ? 26 : 34, 0, Math.PI * 2);
    ctx.fill();
    if (p.night) {
      ctx.fillStyle = p.skyTop;
      ctx.beginPath();
      ctx.arc(sx - 12, sy - 8, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stars at dusk.
    if (p.night) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 40; i++) {
        const sx2 = ((i * 173 + 41) % CANVAS_W);
        const sy2 = ((i * 97 + 13) % 190) + 8;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(state.time * 1.3 + i));
        ctx.globalAlpha = tw * 0.8;
        ctx.fillRect(sx2, sy2, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawMountains(scene) {
    const p = scene.palette;
    ctx.fillStyle = p.mountain;
    ctx.globalAlpha = 0.55;
    const range = WORLD_LENGTH * 0.4;
    for (const m of scene.world.mountains) {
      const base = (((m.x - cam.x * 0.15) % range) + range) % range - 200;
      for (const sx of [base, base + range]) {
        if (sx < -800 || sx > CANVAS_W + 800) continue;
        ctx.beginPath();
        ctx.moveTo(sx - 10, VIEW_H);
        ctx.lineTo(sx, VIEW_H - m.h * 0.55);
        ctx.lineTo(sx + m.w * 0.5, VIEW_H - m.h * 0.85);
        ctx.lineTo(sx + m.w, VIEW_H - m.h * 0.4);
        ctx.lineTo(sx + m.w + 10, VIEW_H);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(scene) {
    const p = scene.palette;
    for (const c of scene.world.clouds) {
      const depth = c.layer === 0 ? 0.35 : 0.6;
      // Parallax by hand: far clouds move slower across the screen.
      const sx = ((c.x - cam.x * depth) % (WORLD_LENGTH + 800) + WORLD_LENGTH + 800) % (WORLD_LENGTH + 800) - 400;
      const sy = VIEW_H * 0.62 - (c.y - cam.y) * 0.35;
      const w = 90 * c.s;
      const h = 26 * c.s;
      ctx.fillStyle = p.cloudShade;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 5, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.cloud;
      ctx.beginPath();
      ctx.ellipse(sx, sy, w, h, 0, 0, Math.PI * 2);
      ctx.ellipse(sx - w * 0.45, sy + 6, w * 0.55, h * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + w * 0.45, sy + 6, w * 0.55, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSeaAndTerrain(scene) {
    const p = scene.palette;
    const world = scene.world;
    const horizon = worldToScreen(0, 0).y;
    // Sea.
    const seaG = ctx.createLinearGradient(0, horizon, 0, VIEW_H);
    seaG.addColorStop(0, p.sea);
    seaG.addColorStop(1, p.seaDeep);
    ctx.fillStyle = seaG;
    ctx.fillRect(0, Math.max(0, horizon), CANVAS_W, VIEW_H - Math.max(0, horizon));
    // Wave sparkle.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    const waveY = horizon + 26;
    if (waveY > 0 && waveY < VIEW_H) {
      ctx.beginPath();
      for (let x = -20; x <= CANVAS_W + 20; x += 46) {
        const wx = x + cam.x;
        const wob = Math.sin(wx * 0.02 + state.time * 1.6) * 3;
        ctx.moveTo(x, waveY + wob);
        ctx.lineTo(x + 22, waveY + wob);
      }
      ctx.stroke();
    }
    // Terrain silhouette.
    ctx.beginPath();
    ctx.moveTo(-10, VIEW_H + 10);
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 8) {
      const wx = sx + cam.x - cam.anchorX;
      const h = world.terrainHeight(wx);
      const sy = cam.anchorY - (h - cam.y);
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(CANVAS_W + 10, VIEW_H + 10);
    ctx.closePath();
    const tg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    tg.addColorStop(0, p.grass);
    tg.addColorStop(1, p.grassDark);
    ctx.fillStyle = tg;
    ctx.fill();
    // Beach fringe where terrain meets the sea, in separate segments.
    ctx.strokeStyle = p.sand;
    ctx.lineWidth = 5;
    ctx.beginPath();
    let penDown = false;
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 8) {
      const wx = sx + cam.x - cam.anchorX;
      const h = world.terrainHeight(wx);
      if (h < 26) {
        const sy = cam.anchorY - (h - cam.y);
        if (!penDown) { ctx.moveTo(sx, sy); penDown = true; }
        else ctx.lineTo(sx, sy);
      } else {
        penDown = false;
      }
    }
    ctx.stroke();
  }

  function drawVillages(scene) {
    const p = scene.palette;
    for (const v of scene.world.villages) {
      const s = worldToScreen(v.x, v.y);
      if (s.x < -80 || s.x > CANVAS_W + 80 || s.y < -40 || s.y > VIEW_H + 40) continue;
      if (v.palm) {
        ctx.strokeStyle = '#5d4a2f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + v.lean * 40, s.y - 22, s.x + v.lean * 52, s.y - 40);
        ctx.stroke();
        ctx.strokeStyle = '#3f7a3a';
        ctx.lineWidth = 3;
        const topX = s.x + v.lean * 52;
        const topY = s.y - 40;
        for (const a of [-2.4, -1.7, -0.9, -0.2, 0.6]) {
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.quadraticCurveTo(topX + Math.cos(a) * 20, topY + Math.sin(a) * 10 + 6, topX + Math.cos(a) * 30, topY + Math.sin(a) * 16 + 8);
          ctx.stroke();
        }
        continue;
      }
      // House: wall + roof + door + window.
      ctx.fillStyle = v.wall;
      ctx.fillRect(s.x - v.w / 2, s.y - v.h, v.w, v.h);
      ctx.fillStyle = v.roof;
      ctx.beginPath();
      ctx.moveTo(s.x - v.w / 2 - 4, s.y - v.h);
      ctx.lineTo(s.x, s.y - v.h - 14);
      ctx.lineTo(s.x + v.w / 2 + 4, s.y - v.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d4a2f';
      ctx.fillRect(s.x - 4, s.y - 14, 8, 14);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(s.x + v.w / 2 - 12, s.y - v.h + 6, 7, 7);
    }
  }

  function drawRunways(scene) {
    for (const key of Object.keys(RUNWAYS)) {
      const r = RUNWAYS[key];
      const a = worldToScreen(r.x0, r.y);
      const b = worldToScreen(r.x1, r.y);
      if (b.x < -100 || a.x > CANVAS_W + 100) continue;
      const y = a.y;
      // Strip.
      ctx.fillStyle = '#3c4148';
      ctx.fillRect(a.x, y - 7, b.x - a.x, 14);
      ctx.fillStyle = '#565d66';
      ctx.fillRect(a.x, y - 7, b.x - a.x, 3);
      // Centreline dashes.
      ctx.fillStyle = '#f5f5f5';
      const dashW = 26;
      for (let x = a.x + 14; x < b.x - 14; x += 52) {
        ctx.fillRect(x, y - 1.5, dashW, 3);
      }
      // Threshold bars.
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(a.x + 8 + i * 10, y - 5, 5, 10);
        ctx.fillRect(b.x - 8 - (i + 1) * 10 + 5, y - 5, 5, 10);
      }
      // Runway numbers.
      ctx.fillStyle = '#f5f5f5';
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.label, a.x + 34, y - 13);
      ctx.fillText(key === 'A' ? '27' : '09', b.x - 34, y - 13);
      // PAPI lights: four lamps that read the glide path.
      const papiX = b.x + 16;
      const plane = scene.plane;
      const dist = Math.abs(plane.x - (r.x0 + r.x1) / 2);
      const alt = plane.y - r.y;
      const onSlope = dist > 40 && alt > 0 && alt / Math.max(1, dist) > 0.04 && alt / Math.max(1, dist) < 0.09;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = onSlope ? '#ff4d4d' : (i < 2 ? '#ff4d4d' : '#ffffff');
        ctx.beginPath();
        ctx.arc(papiX, y - 12 - i * 0, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Windsock.
      const sockX = a.x - 26;
      const sockY = y - 4;
      ctx.strokeStyle = '#c9c9c9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sockX, sockY);
      ctx.lineTo(sockX, sockY - 34);
      ctx.stroke();
      const blow = Math.max(0.25, Math.min(1, scene.world.wind / 30));
      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.moveTo(sockX, sockY - 34);
      ctx.lineTo(sockX - 26 * blow, sockY - 30);
      ctx.lineTo(sockX - 26 * blow, sockY - 24);
      ctx.lineTo(sockX, sockY - 28);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRings(scene) {
    const t = state.time;
    for (const ring of scene.world.rings) {
      const s = worldToScreen(ring.x, ring.y);
      if (s.x < -120 || s.x > CANVAS_W + 120 || s.y < -80 || s.y > VIEW_H + 80) continue;
      const isNext = scene.nextRing === ring;
      const pulse = 1 + 0.06 * Math.sin(t * 3 + ring.index);
      const r = ring.r * pulse;
      if (ring.passed) {
        ctx.strokeStyle = 'rgba(120, 220, 140, 0.75)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(120, 220, 140, 0.9)';
        ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', s.x, s.y + 7);
        continue;
      }
      // Glow.
      const glow = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, r * 1.5);
      glow.addColorStop(0, isNext ? 'rgba(255, 210, 90, 0.35)' : 'rgba(255, 210, 90, 0.18)');
      glow.addColorStop(1, 'rgba(255, 210, 90, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(s.x - r * 1.6, s.y - r * 1.6, r * 3.2, r * 3.2);
      // Torus.
      ctx.strokeStyle = isNext ? '#ffd25e' : '#f5b83d';
      ctx.lineWidth = isNext ? 9 : 7;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, -2.4, -1.2);
      ctx.stroke();
      // Number.
      ctx.fillStyle = isNext ? '#fff3c4' : '#ffe9a8';
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(ring.index + 1), s.x, s.y + 8);
    }
  }

  function drawDropZones(scene) {
    for (const z of scene.world.dropZones) {
      const ground = scene.world.terrainHeight(z.x);
      const s = worldToScreen(z.x, ground);
      if (s.x < -220 || s.x > CANVAS_W + 220) continue;
      const done = z.done;
      ctx.strokeStyle = done ? 'rgba(120,220,140,0.9)' : 'rgba(255, 210, 90, 0.95)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 4, z.r * 0.9, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = done ? 'rgba(120,220,140,0.9)' : '#ffd25e';
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(done ? 'DELIVERED ✓' : 'DROP ZONE', s.x, s.y - 26);
      // Flag.
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x + z.r * 0.9, s.y - 4);
      ctx.lineTo(s.x + z.r * 0.9, s.y - 52);
      ctx.stroke();
      ctx.fillStyle = done ? '#7ddc8c' : '#ff5d5d';
      ctx.beginPath();
      ctx.moveTo(s.x + z.r * 0.9, s.y - 52);
      ctx.lineTo(s.x + z.r * 0.9 + 26, s.y - 45);
      ctx.lineTo(s.x + z.r * 0.9, s.y - 38);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawFuelCans(scene) {
    const t = state.time;
    for (const c of scene.world.fuelCans) {
      if (c.taken) continue;
      const bob = Math.sin(t * 2 + c.bob) * 8;
      const s = worldToScreen(c.x, c.y + bob);
      if (s.x < -60 || s.x > CANVAS_W + 60) continue;
      ctx.fillStyle = 'rgba(255, 120, 90, 0.35)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8492f';
      ctx.fillRect(s.x - 11, s.y - 13, 22, 26);
      ctx.fillStyle = '#ffb02e';
      ctx.fillRect(s.x - 11, s.y - 13, 22, 6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FUEL', s.x, s.y + 4);
    }
  }

  function drawBirds(scene) {
    ctx.strokeStyle = '#22282e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const b of scene.world.birds) {
      if (!b.alive) continue;
      const s = worldToScreen(b.x, b.y + Math.sin(b.phase) * 6);
      if (s.x < -40 || s.x > CANVAS_W + 40) continue;
      const flap = Math.sin(b.phase * 2) * 7;
      ctx.beginPath();
      ctx.moveTo(s.x - 11, s.y - flap);
      ctx.quadraticCurveTo(s.x - 4, s.y + 3, s.x, s.y);
      ctx.quadraticCurveTo(s.x + 4, s.y + 3, s.x + 11, s.y - flap);
      ctx.stroke();
    }
  }

  function drawStormCells(scene) {
    for (const cell of scene.world.stormCells) {
      const s = worldToScreen(cell.x, cell.y);
      if (s.x < -cell.r - 60 || s.x > CANVAS_W + cell.r + 60) continue;
      ctx.fillStyle = 'rgba(24, 28, 44, 0.88)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, cell.r, cell.r * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(s.x - cell.r * 0.5, s.y + 18, cell.r * 0.6, cell.r * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(s.x + cell.r * 0.5, s.y + 14, cell.r * 0.55, cell.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(70, 80, 110, 0.7)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - cell.r * 0.28, cell.r * 0.7, cell.r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // Rain under the cell.
      ctx.strokeStyle = 'rgba(180, 200, 235, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const rx = s.x - cell.r + ((i * 53 + Math.floor(state.time * 900)) % Math.floor(cell.r * 2));
        const ry = s.y + cell.r * 0.3 + ((i * 91 + Math.floor(state.time * 1400)) % 260);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 6, ry + 16);
      }
      ctx.stroke();
    }
  }

  function drawDropPreview(scene) {
    const p = scene.predictedDrop;
    if (!p) return;   // predictDrop() only yields a point while flying
    const s = worldToScreen(p.x, p.y);
    if (s.x < -60 || s.x > CANVAS_W + 60 || s.y < -40 || s.y > VIEW_H + 40) return;
    const pulse = 0.55 + 0.25 * Math.sin(state.time * 5);
    ctx.strokeStyle = 'rgba(255, 210, 90,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 4, 26, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 233, 168, 0.95)';
    ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PARCEL LANDS HERE', s.x, s.y - 18);
  }

  function drawParcels(scene) {
    for (const p of scene.parcels) {
      const s = worldToScreen(p.x, p.y);
      if (s.x < -60 || s.x > CANVAS_W + 60) continue;
      if (!p.landed) {
        // Parachute canopy.
        ctx.fillStyle = '#ff8c42';
        ctx.beginPath();
        ctx.arc(s.x, s.y - 16, 20, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd25e';
        ctx.beginPath();
        ctx.arc(s.x, s.y - 16, 20, Math.PI * 1.25, Math.PI * 1.75);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x - 18, s.y - 14);
        ctx.lineTo(s.x, s.y + 6);
        ctx.moveTo(s.x + 18, s.y - 14);
        ctx.lineTo(s.x, s.y + 6);
        ctx.stroke();
      }
      // The parcel itself.
      ctx.fillStyle = '#b07a3e';
      ctx.fillRect(s.x - 9, s.y + 4, 18, 14);
      ctx.strokeStyle = '#7a5222';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x - 9, s.y + 4, 18, 14);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + 4);
      ctx.lineTo(s.x, s.y + 18);
      ctx.stroke();
    }
  }

  function drawPlane(scene) {
    const plane = scene.plane;
    const s = worldToScreen(plane.x, plane.y);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(plane.dir, 1);
    const bank = plane.turning > 0 ? Math.sin(plane.turning * Math.PI) * 0.35 : 0;
    ctx.rotate((-plane.pitch + bank * 30) * DEG);
    // Prop blur disc.
    const propSpin = state.time * (6 + plane.throttle * 30);
    ctx.fillStyle = 'rgba(200, 220, 240, 0.35)';
    ctx.beginPath();
    ctx.ellipse(34, -2, 4, 16 + Math.sin(propSpin) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3440';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(34, -2 - 15);
    ctx.lineTo(34, -2 + 15);
    ctx.stroke();
    // Tail.
    ctx.fillStyle = '#e8492f';
    ctx.beginPath();
    ctx.moveTo(-26, -4);
    ctx.lineTo(-36, -22);
    ctx.lineTo(-28, -22);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    const fus = ctx.createLinearGradient(0, -14, 0, 8);
    fus.addColorStop(0, '#fdf6e3');
    fus.addColorStop(0.55, '#f3e2b8');
    fus.addColorStop(1, '#d9bd7a');
    ctx.fillStyle = fus;
    ctx.beginPath();
    ctx.moveTo(-30, -4);
    ctx.quadraticCurveTo(-26, -13, -6, -13);
    ctx.lineTo(16, -12);
    ctx.quadraticCurveTo(32, -10, 34, -2);
    ctx.quadraticCurveTo(30, 6, 12, 7);
    ctx.lineTo(-14, 7);
    ctx.quadraticCurveTo(-28, 6, -30, -4);
    ctx.closePath();
    ctx.fill();
    // Teal cheatline + titles.
    ctx.fillStyle = '#1d7fb8';
    ctx.fillRect(-28, -1, 58, 4);
    ctx.fillStyle = '#1d4a6b';
    ctx.font = 'bold 7px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CENDRAWASIH', -2, -5);
    // Cockpit window.
    ctx.fillStyle = '#9fd8f5';
    ctx.beginPath();
    ctx.moveTo(8, -11);
    ctx.lineTo(20, -10);
    ctx.lineTo(24, -3);
    ctx.lineTo(8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2c3440';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Wing (near, lower) + far wing hint.
    ctx.fillStyle = '#e8492f';
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(6, 2);
    ctx.lineTo(2, 16);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(232, 73, 47, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(8, -12);
    ctx.lineTo(4, -20);
    ctx.lineTo(-8, -20);
    ctx.closePath();
    ctx.fill();
    // Landing gear.
    if (plane.gearDown) {
      ctx.strokeStyle = '#2c3440';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(-10, 18);
      ctx.moveTo(10, 6);
      ctx.lineTo(12, 18);
      ctx.stroke();
      ctx.fillStyle = '#22282e';
      ctx.beginPath();
      ctx.arc(-10, 20, 4.5, 0, Math.PI * 2);
      ctx.arc(12, 20, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nav lights (blink).
    const blink = Math.sin(state.time * 6) > 0;
    if (blink) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(-30, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#34d17b';
      ctx.beginPath();
      ctx.arc(33, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Exhaust puffs are spawned by the game; smoke trail when damaged.
    if (plane.hull < 55 && plane.airborne) {
      ctx.fillStyle = 'rgba(60,60,60,0.4)';
      const sx2 = s.x - plane.dir * 34;
      ctx.beginPath();
      ctx.arc(sx2 + Math.sin(state.time * 7) * 4, s.y - 6, 5 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(scene) {
    for (const p of scene.particles) {
      const s = worldToScreen(p.x, p.y);
      if (s.x < -30 || s.x > CANVAS_W + 30 || s.y < -30 || s.y > VIEW_H + 30) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * (p.life / p.maxLife) + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- lit instrument panel along the bottom ----
  function drawPanel(scene) {
    const plane = scene.plane;
    const hud = plane.hud(scene.world);
    ctx.fillStyle = 'rgba(6, 14, 28, 0.92)';
    ctx.fillRect(0, VIEW_H, CANVAS_W, PANEL_H);
    ctx.fillStyle = 'rgba(140, 200, 255, 0.35)';
    ctx.fillRect(0, VIEW_H, CANVAS_W, 2);

    const cy = VIEW_H + PANEL_H / 2;
    // Attitude indicator (artificial horizon).
    const ax = 92;
    const ar = 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, cy, ar, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2f7fd0';
    ctx.fillRect(ax - ar, cy - ar, ar * 2, ar * 2);
    ctx.save();
    ctx.translate(ax, cy);
    ctx.rotate(-plane.pitch * DEG * 0.9);
    const pitchPx = plane.pitch * 1.1;
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-ar, pitchPx, ar * 2, ar * 2);
    ctx.fillStyle = '#2f7fd0';
    ctx.fillRect(-ar, pitchPx - ar * 2, ar * 2, ar * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-ar, pitchPx);
    ctx.lineTo(ar, pitchPx);
    ctx.stroke();
    ctx.restore();
    // Fixed wings + nose marker.
    ctx.strokeStyle = '#ffd25e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax - 26, cy);
    ctx.lineTo(ax - 8, cy);
    ctx.moveTo(ax + 8, cy);
    ctx.lineTo(ax + 26, cy);
    ctx.stroke();
    ctx.fillStyle = '#ffd25e';
    ctx.beginPath();
    ctx.arc(ax, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, cy, ar, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', ax, VIEW_H + PANEL_H - 8);

    // Airspeed dial.
    drawDial(208, cy, 40, hud.spd, 0, 220, 'KT', '#7fd4ff', 'AIRSPEED');
    // Altimeter dial.
    drawDial(318, cy, 40, hud.alt, 0, 3000, 'FT', '#ffd25e', 'ALTITUDE');
    // Compass strip.
    const cx0 = 400;
    const cw = 300;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx0, cy - 26, cw, 52);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx0, cy - 26, cw, 52);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let d = 0; d < 360; d += 15) {
      let rel = ((d - hud.hdg + 540) % 360) - 180;
      const x = cx0 + cw / 2 + rel * (cw / 360) * 2;
      if (x < cx0 - 10 || x > cx0 + cw + 10) continue;
      const major = d % 90 === 0;
      ctx.strokeStyle = major ? '#ffd25e' : 'rgba(234,242,255,0.5)';
      ctx.lineWidth = major ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, cy - 16);
      ctx.lineTo(x, cy - 16 + (major ? 12 : 7));
      ctx.stroke();
      if (major) {
        const label = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : 'W';
        ctx.fillStyle = '#ffd25e';
        ctx.fillText(label + ' ' + String(d).padStart(3, '0'), x, cy + 16);
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#ffd25e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx0 + cw / 2, cy - 26);
    ctx.lineTo(cx0 + cw / 2, cy - 12);
    ctx.stroke();
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HEADING ' + String(hud.hdg).padStart(3, '0') + '°', cx0 + cw / 2, VIEW_H + PANEL_H - 8);

    // Fuel + hull bars.
    drawBar(760, cy - 26, 150, 16, hud.fuel / 100, hud.fuel < 25 ? '#ff5d5d' : '#ffb02e', 'FUEL ' + hud.fuel);
    drawBar(760, cy + 2, 150, 16, hud.hull / 100, hud.hull < 35 ? '#ff5d5d' : '#34d17b', 'HULL ' + hud.hull);
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WIND ' + Math.round(scene.world.wind + scene.world.gustValue) + ' KT', 760, cy + 38);

    // Throttle lever.
    const tx = 950;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(tx, cy - 34, 10, 68);
    ctx.fillStyle = '#7fd4ff';
    const leverY = cy + 34 - (hud.thr / 100) * 68;
    ctx.fillRect(tx - 8, leverY - 5, 26, 10);
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THR ' + hud.thr + '%', tx + 5, VIEW_H + PANEL_H - 8);

    // Gear + stall lights.
    drawLight(1050, cy - 14, plane.gearDown, '#34d17b', 'GEAR');
    drawLight(1050, cy + 16, plane.stalled, '#ff5d5d', 'STALL');
    drawLight(1150, cy - 14, plane.airborne, '#7fd4ff', 'AIRBORNE');
    drawLight(1150, cy + 16, scene.world.paletteKey === 'storm', '#b9a7ff', 'STORM');
  }

  function drawDial(x, y, r, value, min, max, unit, color, label) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    ctx.strokeStyle = 'rgba(234,242,255,0.25)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, r - 7, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, r - 7, a0, a0 + (a1 - a0) * frac);
    ctx.stroke();
    ctx.restore();
    const na = a0 + (a1 - a0) * frac;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(na) * (r - 12), y + Math.sin(na) * (r - 12));
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(value)), x, y + 5);
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(unit + ' · ' + label, x, y + r + 13 > VIEW_H + PANEL_H - 6 ? VIEW_H + PANEL_H - 8 : y + r + 13);
  }

  function drawBar(x, y, w, h, frac, color, label) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#0b1626';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 5, y + h - 4);
  }

  function drawLight(x, y, on, color, label) {
    ctx.fillStyle = on ? color : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#8fc8ff';
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 12, y + 3);
  }

  // Arrow at the screen edge pointing at the next objective.
  function drawTargetArrow(scene) {
    const target = scene.nextTarget;
    if (!target) return;
    const s = worldToScreen(target.x, target.y);
    const margin = 60;
    const cx = Math.max(margin, Math.min(CANVAS_W - margin, s.x));
    const cy = Math.max(margin, Math.min(VIEW_H - margin, s.y));
    if (s.x >= 0 && s.x <= CANVAS_W && s.y >= 0 && s.y <= VIEW_H) {
      // On screen: a small floating marker above the target.
      ctx.fillStyle = 'rgba(255, 210, 90, 0.95)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 44);
      ctx.lineTo(cx - 9, cy - 58);
      ctx.lineTo(cx + 9, cy - 58);
      ctx.closePath();
      ctx.fill();
      return;
    }
    const dx = s.x - cam.anchorX;
    const dy = s.y - cam.anchorY;
    const ang = Math.atan2(dy, dx);
    const ax = cam.anchorX + Math.cos(ang) * 300;
    const ay = Math.max(50, Math.min(VIEW_H - 60, cam.anchorY + Math.sin(ang) * 220));
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255, 210, 90, 0.9)';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(target.label, ax, ay + 26);
  }

  function render(scene) {
    state.time = scene.time;
    updateCamera(scene.plane, scene.dt);
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSky(scene);
    drawMountains(scene);
    drawClouds(scene);
    drawSeaAndTerrain(scene);
    drawVillages(scene);
    drawRunways(scene);
    drawDropZones(scene);
    drawDropPreview(scene);
    drawFuelCans(scene);
    drawRings(scene);
    drawBirds(scene);
    drawStormCells(scene);
    drawParcels(scene);
    drawParticles(scene);
    drawPlane(scene);
    ctx.restore();
    // Lightning flash over everything but the panel.
    if (scene.flash > 0) {
      ctx.fillStyle = 'rgba(230, 238, 255,' + (scene.flash * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, CANVAS_W, VIEW_H);
    }
    drawTargetArrow(scene);
    if (scene.showPanel) drawPanel(scene);
  }

  return {
    ctx, cam, state, worldToScreen, updateCamera, render,
    drawSky, drawMountains, drawClouds, drawSeaAndTerrain, drawVillages,
    drawRunways, drawRings, drawDropZones, drawDropPreview, drawFuelCans, drawBirds,
    drawStormCells, drawParcels, drawPlane, drawParticles, drawPanel,
  };
}

