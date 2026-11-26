// SKY RUSH — Island Courier: the flight model. Throttle makes speed,
// pitch trades speed for climb, slow flight stalls, and the landing is
// judged on sink rate, speed and centreline — never on luck.

import { FLIGHT, LANDING, RUNWAYS, WORLD_LENGTH, FT_PER_PX, KT_PER_PX_S } from './config.js';

const DEG = Math.PI / 180;

export function createPlane(world, runwayKey) {
  const strip = RUNWAYS[runwayKey];
  return {
    // World state (y is height above sea level, up positive).
    x: strip.x0 + 120,
    y: strip.y,
    speed: 0,            // px/s along the flight path
    pitch: 0,            // degrees, + is nose up
    heading: strip.heading, // 90 east, 270 west
    dir: 1,              // +1 east, -1 west
    throttle: 0,
    fuel: FLIGHT.fuelStart,
    hull: FLIGHT.hullStart,
    airborne: false,
    stalled: false,
    gearDown: true,
    turning: 0,          // 0 = not turning, else 0..1 progress of a 180
    turnFrom: 90,
    vy: 0,               // vertical speed, px/s (+ up)
    crashed: false,
    crashReason: '',
    landed: false,
    touchdown: null,     // { sink, speed, center } of the last landing

    reset(runwayKey2) {
      const s = RUNWAYS[runwayKey2];
      this.x = s.x0 + 120;
      this.y = s.y;
      this.speed = 0;
      this.pitch = 0;
      this.heading = s.heading;
      this.dir = 1;
      this.throttle = 0;
      this.fuel = FLIGHT.fuelStart;
      this.hull = FLIGHT.hullStart;
      this.airborne = false;
      this.stalled = false;
      this.gearDown = true;
      this.turning = 0;
      this.vy = 0;
      this.crashed = false;
      this.crashReason = '';
      this.landed = false;
      this.touchdown = null;
    },

    // One physics step. `stick` is -1..1 (pitch), `thr` is the throttle
    // target 0..1. Returns events the game turns into feedback.
    step(dt, stick, thr, world) {
      const events = [];
      if (this.crashed || this.landed) return events;

      // --- turn manoeuvre: a banked 180 over FLIGHT.turnTime seconds ---
      if (this.turning > 0) {
        this.turning = Math.min(1, this.turning + dt / FLIGHT.turnTime);
        const t = this.turning;
        const ease = t * t * (3 - 2 * t);
        this.heading = this.turnFrom + 180 * ease * (this.dir > 0 ? 1 : -1);
        if (this.heading >= 360) this.heading -= 360;
        if (this.heading < 0) this.heading += 360;
        if (this.turning >= 1) {
          this.dir = -this.dir;
          this.heading = this.dir > 0 ? 90 : 270;
          this.turning = 0;
          events.push({ type: 'turned', heading: this.heading });
        }
        // A turn bleeds a little speed.
        this.speed = Math.max(FLIGHT.stallSpeed * 0.9, this.speed - 26 * dt);
      }

      // --- throttle eases toward its target ---
      const thrRate = thr > this.throttle ? 0.9 : 1.4;
      this.throttle += Math.max(-thrRate * dt, Math.min(thrRate * dt, thr - this.throttle));
      this.throttle = Math.max(0, Math.min(1, this.throttle));

      // --- fuel: no fuel, no thrust ---
      if (this.fuel > 0) {
        this.fuel = Math.max(0, this.fuel - (FLIGHT.fuelBurnBase + FLIGHT.fuelBurnThrottle * this.throttle) * dt);
      }
      const hasThrust = this.fuel > 0;

      // --- speed: thrust minus drag, plus a push from a dive ---
      const thrust = hasThrust ? this.throttle * FLIGHT.thrust : 0;
      const drag = FLIGHT.drag * this.speed * (this.speed / FLIGHT.maxSpeed);
      const divePush = -Math.sin(this.pitch * DEG) * 60;
      this.speed += (thrust - drag + divePush) * dt;
      this.speed = Math.max(0, Math.min(FLIGHT.maxSpeed * 1.15, this.speed));

      // --- pitch follows the stick, slower when stalled ---
      const target = stick * FLIGHT.maxPitch;
      const rate = FLIGHT.pitchRate * (this.stalled ? 0.45 : 1);
      this.pitch += Math.max(-rate * dt, Math.min(rate * dt, target - this.pitch));

      // --- vertical speed: lift from speed and pitch, sink when stalled ---
      this.stalled = this.airborne && this.speed < FLIGHT.stallSpeed;
      let climb = Math.sin(this.pitch * DEG) * this.speed * FLIGHT.climbFactor;
      if (this.stalled) climb -= FLIGHT.stallSink * (1 - this.speed / FLIGHT.stallSpeed);
      if (!this.airborne) climb = Math.max(0, climb);
      this.vy += (climb - this.vy) * Math.min(1, dt * 5);
      this.y += this.vy * dt;
      this.x += this.dir * Math.cos(this.pitch * DEG) * this.speed * dt;
      this.x = Math.max(60, Math.min(WORLD_LENGTH - 60, this.x));

      // --- wind: a fixed westward breeze; a headwind outbound, a tailwind home ---
      this.x -= (world.wind + world.gustValue) * dt * 0.35;
      if (world.gustValue !== 0 && this.airborne) {
        this.pitch += world.gustValue * 0.02 * dt * 8;
        this.pitch = Math.max(-FLIGHT.maxPitch, Math.min(FLIGHT.maxPitch, this.pitch));
      }

      // --- gear: automatic below 120 kt and 500 ft ---
      const altFt = (this.y - world.terrainHeight(this.x)) * FT_PER_PX;
      this.gearDown = this.speed < 240 && altFt < 500;

      // --- lift-off ---
      if (!this.airborne && this.speed > 175 && this.pitch > 4) {
        this.airborne = true;
        events.push({ type: 'liftoff' });
      }

      // --- ground contact ---
      const ground = world.terrainHeight(this.x);
      if (this.y <= ground) {
        this.y = ground;
        const onRunway = this.onRunway(world);
        const sink = -this.vy;
        if (this.airborne && onRunway) {
          if (sink <= LANDING.maxSink && this.speed >= LANDING.minSpeed && this.speed <= LANDING.maxSpeed) {
            this.landed = true;
            const strip2 = onRunway;
            const center = (strip2.x0 + strip2.x1) / 2;
            this.touchdown = { sink, speed: this.speed, center: Math.abs(this.x - center) };
            events.push({ type: 'landed', touchdown: this.touchdown });
          } else if (sink <= LANDING.hardSink && this.speed >= LANDING.minSpeed * 0.8) {
            // Hard landing: she bounces, the hull complains, the sortie goes on.
            this.hull = Math.max(0, this.hull - 18);
            this.vy = 55;
            this.y = ground + 2;
            this.speed *= 0.82;
            events.push({ type: 'hard-landing', sink });
            if (this.hull <= 0) {
              this.crashed = true;
              this.crashReason = 'The hard landing broke her back.';
              events.push({ type: 'crashed', reason: this.crashReason });
            }
          } else {
            this.crashed = true;
            this.crashReason = sink > LANDING.hardSink
              ? 'Slammed into the runway — too steep, too fast.'
              : 'Stalled onto the runway short of flying speed.';
            events.push({ type: 'crashed', reason: this.crashReason });
          }
        } else if (this.airborne) {
          this.crashed = true;
          this.crashReason = ground <= 1
            ? 'Ditched in the sea.'
            : 'Flew into the hillside.';
          events.push({ type: 'crashed', reason: this.crashReason });
        } else {
          // Still rolling on the ground: stay planted.
          this.vy = 0;
        }
      }
      return events;
    },

    onRunway(world) {
      for (const key of Object.keys(RUNWAYS)) {
        const r = RUNWAYS[key];
        if (this.x >= r.x0 - 10 && this.x <= r.x1 + 10) return r;
      }
      return null;
    },

    // HUD numbers, in the units a pilot reads.
    hud(world) {
      const agl = Math.max(0, (this.y - world.terrainHeight(this.x)) * FT_PER_PX);
      return {
        alt: Math.round(agl),
        spd: Math.round(this.speed * KT_PER_PX_S),
        hdg: Math.round(this.heading),
        thr: Math.round(this.throttle * 100),
        fuel: Math.max(0, Math.round(this.fuel)),
        hull: Math.max(0, Math.round(this.hull)),
      };
    },
  };
}
