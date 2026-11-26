// SKY RUSH — Island Courier: all sound is synthesised with WebAudio.
// No audio files, no samples, nothing fetched. Everything is guarded so
// the game still runs where audio is unavailable (headless browsers).

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);

      // Engine: two detuned saws through a low-pass, pitch follows throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 52 * 1.007;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();

      // Wind: looped noise through a band-pass, gain follows airspeed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSource = ctx.createBufferSource();
      windSource.buffer = buf;
      windSource.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 480;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();
      started = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (err) { /* audio is best-effort */ }
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start(t0);
    } catch (err) { /* audio is best-effort */ }
  }

  return {
    unlock() { if (ensure() && ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = m;
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
    },
    isMuted() { return muted; },
    setEngine(throttle, speedNorm, airborne) {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      const base = 46 + throttle * 68 + speedNorm * 22;
      engineOsc.frequency.setTargetAtTime(base, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(base * 1.007, t, 0.08);
      engineGain.gain.setTargetAtTime(airborne ? 0.05 + throttle * 0.075 : 0.028 + throttle * 0.02, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.16, speedNorm * 0.16), t, 0.15);
      windFilter.frequency.setTargetAtTime(380 + speedNorm * 700, t, 0.2);
    },
    ring() { tone(880, 0.16, 'sine', 0.22); tone(1318, 0.22, 'sine', 0.18, 0.09); },
    parcel() { tone(220, 0.12, 'triangle', 0.2, 0, 110); },
    parcelGood() { tone(523, 0.14, 'sine', 0.2); tone(784, 0.2, 'sine', 0.2, 0.08); },
    touchdown() { noiseBurst(0.18, 0.3, 420); tone(140, 0.16, 'sine', 0.22, 0, 70); },
    crash() { noiseBurst(0.7, 0.5, 900); tone(90, 0.6, 'sawtooth', 0.25, 0, 38); },
    click() { tone(660, 0.06, 'square', 0.08); },
    stall() { tone(440, 0.18, 'square', 0.1); tone(440, 0.18, 'square', 0.1, 0.22); },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.18, i * 0.11));
    },
  };
}
