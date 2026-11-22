// Keyboard + mouse input state.
export const keys = {};
export const pressed = {};
let mouseFire = false;
export function initInput() {
  addEventListener('keydown', (e) => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true; if (['ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault(); });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('mousedown', () => { mouseFire = true; });
  addEventListener('mouseup', () => { mouseFire = false; });
}
export const firing = () => mouseFire || keys['KeyF'];
export function consume(code) { const p = pressed[code]; pressed[code] = false; return !!p; }
export function endFrame() { for (const k in pressed) pressed[k] = false; }
