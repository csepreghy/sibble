/**
 * Procedural Story Mode sound effects (Web Audio, no files). Presentation only.
 * Per-device on/off preference in localStorage.
 */
const KEY = "sibble:story:sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function loadStorySound(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}
export function saveStorySound(on: boolean) {
  window.localStorage.setItem(KEY, on ? "on" : "off");
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !loadStorySound()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
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

function tone(freq: number, dur: number, { type = "triangle" as OscillatorType, vol = 0.3, at = 0, slideTo = 0 } = {}) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, { vol = 0.4, at = 0, filter = 1200, q = 0.8, type = "bandpass" as BiquadFilterType } = {}) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// Major pentatonic steps so rising hits always sound musical.
const SCALE = [0, 2, 4, 7, 9];
const pitch = (step: number, root = 392) => root * 2 ** ((Math.floor(step / 5) * 12 + SCALE[step % 5]!) / 12);

/** A number landing in Base (blue) or Mult (orange); pitch climbs with each step. */
export function soundHit(kind: "base" | "mult", step: number) {
  const f = pitch(Math.min(step, 14), kind === "base" ? 330 : 440);
  tone(f, 0.16, { type: "triangle", vol: 0.28 });
  tone(f * 2, 0.08, { type: "sine", vol: 0.1 });
  noise(0.04, { vol: 0.2, filter: 3000 });
}

/** Heavy box-into-box smash. */
export function soundSlam() {
  tone(150, 0.35, { type: "sine", vol: 0.55, slideTo: 45 });
  noise(0.12, { vol: 0.35, filter: 500, type: "lowpass" });
}

/** Rising tick stream over a count-up; longer counts climb higher. */
export function soundCount(durationMs: number) {
  if (durationMs < 60) return;
  const ticks = Math.min(40, Math.max(4, Math.round(durationMs / 45)));
  for (let i = 0; i < ticks; i++) {
    const p = i / ticks;
    // Ticks accelerate like the counter does.
    const at = (durationMs / 1000) * Math.sqrt(p);
    tone(500 * 2 ** (p * 1.5), 0.03, { type: "square", vol: 0.05, at });
  }
}

/** Party-popper pop with a sparkle afterglow. */
export function soundConfetti() {
  noise(0.09, { vol: 0.9, filter: 1800, q: 0.6 });
  tone(260, 0.08, { type: "sine", vol: 0.4, slideTo: 90 });
  for (let i = 0; i < 12; i++) {
    tone(1800 + Math.random() * 2600, 0.18, { type: "sine", vol: 0.06, at: 0.12 + i * 0.07 + Math.random() * 0.04 });
  }
}

/** Coins clinking into the purse. */
export function soundCoin() {
  tone(1318, 0.12, { type: "square", vol: 0.08 });
  tone(1976, 0.3, { type: "square", vol: 0.08, at: 0.07 });
}

/** Modal sliding up. */
export function soundWhoosh() {
  noise(0.35, { vol: 0.25, filter: 900, q: 0.5 });
}

/** A shop item popping into place. */
export function soundPop(i = 0) {
  tone(600 + i * 70, 0.07, { type: "sine", vol: 0.25, slideTo: 1100 + i * 90 });
}
