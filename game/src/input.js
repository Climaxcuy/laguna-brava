// Keyboard and mouse state for Laguna Brava. The rest of the game never touches DOM events:
// it polls this one object each simulation step. Two kinds of query live here — held keys for
// steering and throttle, and pressed-this-frame edges for one-shot actions (enter a car, open
// the map, fire a single revolver shot) — because a held E must board exactly one airboat.
// A virtual override (setVirtual) lets the ?smoke=1 self-test drive the same queries with
// scripted hands, so the autopilot proves the real systems, not a parallel toy.

export const ACTIONS = {
  interact: 'KeyE',
  map: 'KeyM',
  pause: 'KeyP',
  escape: 'Escape',
  night: 'KeyN',
  radio: 'KeyR',
  confirm: 'Enter',
  horn: 'KeyH',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, rightDown: false };
  let virtual = null;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onBlur() {
    held.clear();
    mouse.down = false;
    mouse.rightDown = false;
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }
  function onMouseDown(event) {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
    if (event.button === 2) mouse.rightDown = true;
  }
  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
    if (event.button === 2) mouse.rightDown = false;
  }
  function onContextMenu(event) {
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    mouse,
    /** Install (or clear, with null) the scripted-hands override used by the smoke test. */
    setVirtual(v) {
      virtual = v;
    },
    /** True while the key is down. */
    down(code) {
      return virtual ? virtual.held.has(code) : held.has(code);
    },
    /** True only on the frame the key went down; endFrame clears the edge set. */
    pressed(code) {
      return virtual ? virtual.pressedSet.has(code) : pressed.has(code);
    },
    /** The steering axis: -1 left, 1 right, from A/D or the arrow keys. */
    steer() {
      if (virtual) return virtual.steer;
      let v = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) v -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) v += 1;
      return v;
    },
    /** The throttle axis: 1 forward (W), -1 reverse/brake (S). */
    throttle() {
      if (virtual) return virtual.throttle;
      let v = 0;
      if (held.has('KeyW') || held.has('ArrowUp')) v += 1;
      if (held.has('KeyS') || held.has('ArrowDown')) v -= 1;
      return v;
    },
    /** On-foot movement vector from WASD/arrows, normalised; {x, y} in world axes. */
    moveVector() {
      if (virtual) return virtual.move;
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Run modifier for on-foot movement. */
    running() {
      return virtual ? virtual.run : held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** Fire is F held, the mouse held, or Space held: all three read the same. */
    firing() {
      return virtual ? virtual.firing : held.has('KeyF') || held.has('Space') || mouse.down;
    },
    /** Weapon slot 1-6 chosen this frame, or 0 for none. */
    weaponSlot() {
      if (virtual) return virtual.slot ?? 0;
      for (let slot = 1; slot <= 6; slot += 1) {
        if (pressed.has('Digit' + slot)) return slot;
      }
      return 0;
    },
    /** Call once per rendered frame, after the simulation steps have read the edges. */
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
      if (virtual) {
        virtual.pressedSet.clear();
        virtual.slot = 0;
      }
    },
    /** Detach every listener (used by the shot scenes to leave a clean page). */
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    },
  };
}
