// WebAudio synth: V8 rumble, airboat fan, siren, shots, UI clicks. No audio files.
let ctx = null, engineOsc = null, engineGain = null, fanOsc = null, sirenOsc = null;
export function initAudio() {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  if (!ctx) return;
  engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
  engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55; engineGain.gain.value = 0;
  engineOsc.connect(engineGain).connect(ctx.destination); engineOsc.start();
  fanOsc = ctx.createOscillator(); fanOsc.type = 'square'; fanOsc.frequency.value = 90;
  const fg = ctx.createGain(); fg.gain.value = 0; fanOsc.connect(fg).connect(ctx.destination); fanOsc.start(); fanOsc._g = fg;
}
function blip(freq, dur, type = 'square', vol = 0.12) {
  if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
}
export const sfx = {
  shot() { blip(160, 0.09, 'sawtooth', 0.2); blip(70, 0.14, 'square', 0.16); },
  ui() { blip(660, 0.05, 'sine', 0.08); },
  cash() { blip(880, 0.08, 'sine', 0.12); setTimeout(() => blip(1320, 0.1, 'sine', 0.12), 60); },
  stunt() { blip(520, 0.12, 'triangle', 0.15); setTimeout(() => blip(780, 0.16, 'triangle', 0.15), 90); },
  steal() { blip(220, 0.1, 'square', 0.14); },
  engine(speed, inBoat) {
    if (!ctx) return;
    engineGain.gain.value = Math.min(0.14, Math.abs(speed) * 0.004);
    engineOsc.frequency.value = 50 + Math.abs(speed) * 1.6;
    if (fanOsc) fanOsc._g.gain.value = inBoat ? Math.min(0.1, Math.abs(speed) * 0.004) : 0;
    if (fanOsc && inBoat) fanOsc.frequency.value = 80 + Math.abs(speed) * 3;
  },
  siren(on) {
    if (!ctx) return;
    if (on && !sirenOsc) { sirenOsc = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0.03; sirenOsc.type = 'triangle'; sirenOsc.connect(g).connect(ctx.destination); sirenOsc.start(); sirenOsc._t = 0; }
    if (!on && sirenOsc) { try { sirenOsc.stop(); } catch {} sirenOsc = null; }
    if (sirenOsc) { sirenOsc._t += 0.05; sirenOsc.frequency.value = 700 + Math.sin(sirenOsc._t * 6) * 180; }
  },
};
