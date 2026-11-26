# FEATURES — SKY RUSH: Island Courier

## Flight model
- [x] Pitch (W/S or Up/Down, mouse drag, touch drag) — climb/descent rate
      follows pitch and speed; nose attitude shown on the artificial horizon.
- [x] Throttle (D/A or Right/Left, mouse wheel, on-screen lever) — speed
      follows throttle with drag; min speed stalls.
- [x] Stall: below flying speed the nose drops, controls mush, warning flashes.
- [x] Turn-around (T key / TURN button): 180° banked turn, heading flips
      090° <-> 270°, used by the storm mission's return leg.
- [x] Landing gear: automatic below 120 kt and 500 ft, gear light on the panel;
      touchdown judged on vertical speed, speed and centreline.

## World
- [x] Island chain: sea, beaches, hills, villages (houses, palms, roads),
      two runways with markings, windsock, PAPI lights.
- [x] Parallax: sky gradient per mission, sun/moon, far mountains, cloud layers.
- [x] Weather: calm morning, golden hour, dusk storm (rain, gusts, lightning
      flash, darker sky).
- [x] Rings: glowing target rings with numbers, chime + flash on pass.
- [x] Drop zones (mission 2): marked village circles, parcel falls with a
      parachute, accuracy scored by distance to centre. A live
      "PARCEL LANDS HERE" marker on the ground predicts exactly where a
      parcel dropped right now will land, so the drop is a skill shot.
- [x] Fuel cans (mission 3): floating cans, +35 fuel on collect.
- [x] Hazards: birds (mission 1-2), storm cells (mission 3), terrain, sea.

## Systems
- [x] Fuel: drains with throttle; empty = glide only; out of fuel over the sea
      is a real decision, not a timer.
- [x] Hull: 100%, damage from terrain/bird/storm contact and hard landings;
      0% = crash. Smoke trail as hull falls.
- [x] Score: rings +100, parcel accuracy up to +150, landing quality up to
      +500, time bonus, fuel-remaining bonus. Stars 1-3 per mission.
- [x] Best scores + stars per mission saved in localStorage.

## HUD and instruments (lit panel)
- [x] Top HUD: ALT (ft), SPD (kt), HDG (deg + compass direction), THR %,
      FUEL, SCORE, mission + rings/parcels progress.
- [x] Instrument panel: attitude indicator (artificial horizon + pitch ladder),
      airspeed dial, altimeter dial, heading tape, fuel gauge, hull gauge,
      throttle lever, gear / stall / airborne / storm lights, wind readout.
- [x] Objective line: rings left / parcels left, next target arrow.
- [x] Messages: "Throttle up — hold D…", "Airborne!", "Ring 3 — +100 pts",
      "Parcel delivered! +… pts", "Hard landing! Hull −18", "LOW FUEL",
      stall warning banner.

## Screens and flow
- [x] Menu with mission cards, best scores, controls, sound toggle.
- [x] Briefing per mission (goal, weather, runway).
- [x] Pause (P / button), mute (M), restart (R).
- [x] Mission-complete debrief with score breakdown and stars.
- [x] Crash screen with the cause (terrain / stall / fuel / hull / sea).
- [x] Deterministic `?shot=menu|fly|land|complete&seed=N` states for screenshots.

## Sound (all synthesised, WebAudio, no files)
- [x] Engine drone (pitch follows throttle), wind noise, ring chime, parcel
      thud, touchdown thump, crash, UI clicks, stall shaker. Mute toggle.

## Tech
- [x] Vanilla JS ES modules, no libraries, no network. Canvas 2D, 1280x720.
- [x] `main.ts` hands in game/ + screenshots/ + dossier.json (kit library).
- [x] 4 screenshots (1280x720 JPEG, real renders): cover flight, menu,
      landing approach, debrief.
