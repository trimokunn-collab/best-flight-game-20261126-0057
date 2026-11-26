// SKY RUSH — Island Courier: keyboard, mouse and touch input.
// One object the game polls every frame; it never owns game state.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    pitch: 0,            // -1 (nose down) .. +1 (nose up), from keys/drag
    throttleKey: 0,      // -1 / +1 while a throttle key is held
    wheelDelta: 0,       // accumulated mouse-wheel throttle
    dragPitch: 0,        // pitch from an active pointer drag
    dragging: false,
    turnPressed: false,
    dropPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    confirmPressed: false,
    anyPressed: false,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  function recomputePitch() {
    // Vertical keys fly the nose; horizontal keys work the throttle.
    let p = 0;
    if (keys.has('up')) p += 1;
    if (keys.has('down')) p -= 1;
    if (state.dragging) p += state.dragPitch;
    state.pitch = Math.max(-1, Math.min(1, p));
    let t = 0;
    if (keys.has('right')) t += 1;
    if (keys.has('left')) t -= 1;
    state.throttleKey = t;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const action = KEYMAP[e.code];
    if (action) {
      keys.add(action);
      recomputePitch();
      e.preventDefault();
      state.anyPressed = true;
      return;
    }
    if (e.code === 'KeyT') { state.turnPressed = true; state.anyPressed = true; }
    if (e.code === 'Space') { state.dropPressed = true; state.anyPressed = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') { state.pausePressed = true; }
    if (e.code === 'KeyM') { state.mutePressed = true; }
    if (e.code === 'KeyR') { state.restartPressed = true; }
    if (e.code === 'Enter') { state.confirmPressed = true; state.anyPressed = true; }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) { keys.delete(action); recomputePitch(); }
  });
  window.addEventListener('blur', () => { keys.clear(); recomputePitch(); });

  // Mouse: drag vertically to pitch, wheel for throttle, click for nothing
  // (buttons are DOM). Touch: same drag, plus the on-screen buttons.
  let dragStartY = 0;
  let dragStartX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    dragStartY = e.clientY;
    dragStartX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dy = (dragStartY - e.clientY) / 140;
    const dx = (e.clientX - dragStartX) / 400;
    state.dragPitch = Math.max(-1, Math.min(1, dy + dx * 0.4));
    recomputePitch();
  });
  function endDrag() {
    state.dragging = false;
    state.dragPitch = 0;
    recomputePitch();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    state.wheelDelta += (e.deltaY < 0 ? 1 : -1) * 0.06;
    e.preventDefault();
  }, { passive: false });

  // On-screen touch buttons (DOM, wired by id).
  function wireButton(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
  }
  wireButton('btn-turn', () => { state.turnPressed = true; });
  wireButton('btn-drop', () => { state.dropPressed = true; });
  wireButton('btn-thr-up', () => { state.wheelDelta += 0.12; });
  wireButton('btn-thr-down', () => { state.wheelDelta -= 0.12; });

  // Edge-triggered presses are consumed by the game once per frame.
  state.consume = function consume() {
    const out = {
      turn: state.turnPressed,
      drop: state.dropPressed,
      pause: state.pausePressed,
      mute: state.mutePressed,
      restart: state.restartPressed,
      confirm: state.confirmPressed,
      any: state.anyPressed,
      wheel: state.wheelDelta,
    };
    state.turnPressed = false;
    state.dropPressed = false;
    state.pausePressed = false;
    state.mutePressed = false;
    state.restartPressed = false;
    state.confirmPressed = false;
    state.anyPressed = false;
    state.wheelDelta = 0;
    return out;
  };

  return state;
}
