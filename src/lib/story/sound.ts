/**
 * Procedural Story Mode sound effects (Web Audio, no files). Presentation only.
 * Uses physical-style synthesis (struck wood/bells, filtered transients, room
 * reverb, bus compression) instead of raw chiptune oscillators.
 * Per-device on/off preference in localStorage.
 */
const KEY = "sibble:story:sound";

/**
 * Which effects are currently switched on. Every sound below stays implemented;
 * add its name back to this list to bring it back.
 */
const ENABLED = new Set(["confetti", "coin"]);
const isOn = (name: string) => ENABLED.has(name);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function loadStorySound(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}
export function saveStorySound(on: boolean) {
  window.localStorage.setItem(KEY, on ? "on" : "off");
}

function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.ceil(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !loadStorySound()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const c = new AC();
      ctx = c;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      master = c.createGain();
      master.gain.value = 0.8;
      comp.connect(master).connect(c.destination);
      dry = c.createGain();
      dry.connect(comp);
      const verb = c.createConvolver();
      verb.buffer = impulse(c, 1.8, 3);
      wet = c.createGain();
      wet.gain.value = 0.28;
      wet.connect(verb).connect(comp);
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a user gesture so iOS allows sound later. */
export function unlockStorySound() {
  audio();
}

/** Route a node to dry bus plus a reverb send. */
function out(node: AudioNode, send = 0.3) {
  const c = ctx!;
  node.connect(dry!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    node.connect(s).connect(wet!);
  }
}

/** Exponentially decaying sine partial (struck-object model). */
function partial(freq: number, vol: number, decay: number, at: number, send = 0.3, attack = 0.002) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setTargetAtTime(0.0001, t + attack, decay / 4);
  o.connect(g);
  out(g, send);
  o.start(t);
  o.stop(t + decay * 1.6 + 0.05);
}

/** Filtered noise transient. */
function burst(dur: number, { vol = 0.3, at = 0, freq = 2000, q = 1, type = "bandpass" as BiquadFilterType, send = 0.2, sweepTo = 0 } = {}) {
  const c = audio();
  if (!c || !noiseBuf) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  out(g, send);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

/** Pitch-dropping body thump (kick / table hit). */
function thump(from: number, to: number, dur: number, vol: number, at = 0, send = 0.15) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  const shaper = c.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2);
  }
  shaper.curve = curve;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(shaper).connect(g);
  out(g, send);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Major pentatonic so rising hits stay musical.
const SCALE = [0, 2, 4, 7, 9];
const pitch = (step: number, root: number) => root * 2 ** ((Math.floor(step / 5) * 12 + SCALE[step % 5]!) / 12);

/** A number landing in Base (wooden marimba) or Mult (bright struck bell); pitch climbs each step. */
export function soundHit(kind: "base" | "mult", step: number) {
  if (!isOn("hit")) return;
  const s = Math.min(step, 14);
  if (kind === "base") {
    const f = pitch(s, 262);
    // Marimba: strong fundamental, 4x and ~10x bar overtones decaying fast.
    partial(f, 0.42, 0.45, 0, 0.25);
    partial(f * 4, 0.12, 0.08, 0, 0.2);
    partial(f * 9.9, 0.04, 0.03, 0, 0.1);
    burst(0.018, { vol: 0.25, freq: 1800, q: 0.7, send: 0.05 });
    thump(f * 0.5, f * 0.45, 0.12, 0.12, 0, 0);
  } else {
    const f = pitch(s, 392);
    // Glassy bell: inharmonic partials, longer ring into the room.
    partial(f, 0.32, 0.9, 0, 0.45);
    partial(f * 2.76, 0.12, 0.45, 0, 0.45);
    partial(f * 5.4, 0.05, 0.2, 0, 0.4);
    partial(f * 0.5, 0.16, 0.35, 0, 0.2);
    burst(0.015, { vol: 0.18, freq: 5000, q: 0.8, send: 0.1 });
    thump(140, 60, 0.14, 0.25, 0, 0);
  }
}

/** Heavy box-into-box smash: saturated sub drop, crack and room tail. */
export function soundSlam() {
  if (!isOn("slam")) return;
  thump(130, 38, 0.55, 0.9, 0, 0.25);
  burst(0.05, { vol: 0.5, freq: 3200, q: 0.6, send: 0.4 });
  burst(0.35, { vol: 0.35, freq: 600, type: "lowpass", send: 0.5 });
  partial(98, 0.18, 1.2, 0, 0.6);
  partial(147, 0.1, 1.0, 0, 0.6);
}

/** Mechanical odometer clicks over a count-up; they accelerate and brighten. */
export function soundCount(durationMs: number) {
  if (!isOn("count") || durationMs < 60) return;
  const ticks = Math.min(36, Math.max(4, Math.round(durationMs / 50)));
  for (let i = 0; i < ticks; i++) {
    const p = i / ticks;
    const at = (durationMs / 1000) * Math.sqrt(p);
    burst(0.012, { vol: 0.16 + p * 0.06, at, freq: 2400 + p * 2600, q: 4, send: 0.03 });
    partial(700 + p * 500, 0.03, 0.02, at, 0);
  }
}

/** Party-popper crack, then a shimmering wind-chime afterglow. */
export function soundConfetti() {
  // The pop: sharp crack + chest thump + paper flutter.
  burst(0.04, { vol: 1, freq: 1400, q: 0.5, send: 0.35 });
  burst(0.012, { vol: 0.8, freq: 6000, type: "highpass", send: 0.2 });
  thump(180, 50, 0.22, 0.7, 0, 0.1);
  for (let i = 0; i < 18; i++) {
    burst(0.03, { vol: 0.07, at: 0.05 + Math.random() * 0.9, freq: 3000 + Math.random() * 4000, q: 2, send: 0.4 });
  }
  // Afterglow: tuned bell chimes (major 9) shimmering into the reverb.
  if (!isOn("confetti-afterglow")) return;
  const chord = [1046.5, 1318.5, 1568, 1975.5, 2349.3, 2637];
  for (let i = 0; i < 14; i++) {
    const f = chord[Math.floor(Math.random() * chord.length)]! * (Math.random() < 0.3 ? 2 : 1);
    const at = 0.18 + i * 0.075 + Math.random() * 0.05;
    const v = 0.07 * (1 - i / 18);
    partial(f, v, 1.1, at, 0.8, 0.004);
    partial(f * 2.76, v * 0.3, 0.4, at, 0.8, 0.004);
  }
  burst(1.4, { vol: 0.05, at: 0.15, freq: 9000, type: "highpass", send: 0.9 });
}

/** Heavy gold coins clinking. */
function clink(at: number, base: number, vol: number) {
  for (const r of [1, 1.47, 2.09, 2.56, 3.41]) partial(base * r, vol / r, 0.35 / Math.sqrt(r), at, 0.35, 0.001);
  burst(0.01, { vol: vol * 1.2, at, freq: 7000, q: 1, send: 0.1 });
}
export function soundCoin() {
  if (!isOn("coin")) return;
  clink(0, 2100, 0.12);
  clink(0.06, 2450, 0.1);
  clink(0.13, 1900, 0.08);
}

/** Modal sliding up: airy swept whoosh. */
export function soundWhoosh() {
  if (!isOn("whoosh")) return;
  burst(0.45, { vol: 0.35, freq: 300, q: 1.2, sweepTo: 2200, send: 0.3 });
}

/** A shop item slapping onto the table like a card. */
export function soundPop(i = 0) {
  if (!isOn("pop")) return;
  const v = 1 + (i % 4) * 0.04;
  burst(0.03, { vol: 0.5, freq: 2200 * v, q: 0.6, send: 0.2 });
  burst(0.08, { vol: 0.25, freq: 900, type: "lowpass", send: 0.15 });
  thump(220 * v, 90, 0.09, 0.35, 0, 0.05);
}
