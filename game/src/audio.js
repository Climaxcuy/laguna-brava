// Laguna Brava's sound is one small WebAudio synth: no samples, no files, just oscillators
// and filtered noise shaped per event. The AudioContext is created lazily on the first user
// gesture (browsers refuse earlier), and every entry point tolerates the context not existing
// yet — the screenshot scenes run silent, and a muted tab must never break the simulation.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineNodes = null;
  let fanNodes = null;
  let sirenNodes = null;
  let radioOn = false;
  let radioTimer = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** A short pitched blip with an exponential fall: pickups, menu ticks, debt paid. */
  function blip(freq, seconds = 0.12, type = 'square', volume = 0.2, slideTo = null) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  /** A burst of white noise through a band filter: gunshots, fan wash, splashes, thunder. */
  function noise(seconds, filterFreq, volume = 0.3, type = 'bandpass', q = 0.8) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
  }

  /** A looping hum (engine, airboat fan, siren) whose pitch follows a throttle value. */
  function makeLoop(type, baseFreq, volume) {
    if (!ensure()) return null;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = baseFreq;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(master);
    osc.start();
    return { osc, gain, baseFreq, volume };
  }
  function setLoop(loop, level, pitchScale) {
    if (!loop || !ctx) return;
    const t = ctx.currentTime;
    loop.gain.gain.setTargetAtTime(loop.volume * Math.min(1, Math.max(0, level)), t, 0.08);
    loop.osc.frequency.setTargetAtTime(loop.baseFreq * pitchScale, t, 0.08);
  }
  function stopLoop(loop) {
    if (!loop || !ctx) return;
    loop.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  return {
    /** Call from any key/click handler so the context unlocks as early as possible. */
    unlock() {
      ensure();
    },
    shot() {
      noise(0.14, 1800, 0.5, 'lowpass');
      blip(160, 0.08, 'square', 0.25, 60);
    },
    boom() {
      noise(0.3, 700, 0.7, 'lowpass');
      blip(90, 0.22, 'sine', 0.4, 40);
    },
    crack() {
      noise(0.2, 2600, 0.5, 'highpass');
      blip(220, 0.1, 'square', 0.2, 70);
    },
    swing() {
      noise(0.08, 900, 0.12);
    },
    hit() {
      blip(120, 0.09, 'sawtooth', 0.25, 60);
    },
    hurt() {
      blip(200, 0.16, 'sawtooth', 0.3, 80);
    },
    pickup() {
      blip(660, 0.09, 'square', 0.18);
      setTimeout(() => blip(990, 0.12, 'square', 0.18), 70);
    },
    cash() {
      blip(880, 0.07, 'triangle', 0.22);
      setTimeout(() => blip(1320, 0.1, 'triangle', 0.2), 60);
    },
    missionDone() {
      blip(523, 0.14, 'triangle', 0.25);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.25), 120);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.28), 240);
    },
    missionFail() {
      blip(330, 0.2, 'sawtooth', 0.22, 220);
      setTimeout(() => blip(220, 0.3, 'sawtooth', 0.22, 140), 160);
    },
    splash() {
      noise(0.35, 500, 0.3, 'lowpass');
    },
    crash(intensity = 1) {
      noise(0.25, 350, 0.5 * intensity, 'lowpass');
      blip(70, 0.2, 'sine', 0.35 * intensity, 35);
    },
    thunder() {
      noise(1.4, 120, 0.5, 'lowpass');
    },
    door() {
      blip(140, 0.06, 'square', 0.15, 90);
    },
    /** Engine and fan loops follow the vehicle the player sits in; call every frame. */
    vehicleLoop(kind, throttleLevel, speedRatio) {
      if (kind === 'car') {
        if (!engineNodes) engineNodes = makeLoop('sawtooth', 55, 0.12);
        setLoop(engineNodes, 0.4 + throttleLevel * 0.6, 1 + speedRatio * 1.6);
        stopLoop(fanNodes);
      } else if (kind === 'boat') {
        if (!fanNodes) fanNodes = makeLoop('square', 38, 0.1);
        setLoop(fanNodes, 0.4 + throttleLevel * 0.6, 1 + speedRatio * 1.2);
        stopLoop(engineNodes);
        if (Math.random() < 0.1) noise(0.1, 800, 0.03, 'lowpass');
      } else {
        stopLoop(engineNodes);
        stopLoop(fanNodes);
      }
    },
    /** The Patrulla's two-tone: a slow square LFO while any unit can see the player. */
    siren(active) {
      if (active) {
        if (!sirenNodes) {
          sirenNodes = makeLoop('square', 700, 0.045);
          if (sirenNodes) {
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.7;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 180;
            lfo.connect(lfoGain).connect(sirenNodes.osc.frequency);
            lfo.start();
            sirenNodes.lfo = lfo;
          }
        }
        if (sirenNodes) setLoop(sirenNodes, 1, 1);
      } else if (sirenNodes) {
        stopLoop(sirenNodes);
      }
    },
    /** Laguna 91.3: a lazy three-note marimba loop while the radio is on in a vehicle. */
    radioTick(dt, inVehicle) {
      if (!inVehicle) return;
      if (!radioOn) return;
      radioTimer -= dt;
      if (radioTimer <= 0) {
        radioTimer = 0.42;
        const scale = [392, 440, 523, 587, 523, 440];
        const note = scale[Math.floor(Math.random() * scale.length)];
        blip(note, 0.3, 'triangle', 0.06);
      }
    },
    toggleRadio() {
      radioOn = !radioOn;
      return radioOn;
    },
    get radioOn() {
      return radioOn;
    },
  };
}
