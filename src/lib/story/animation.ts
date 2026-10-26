import type { ScoreEvent } from "./scoring";

export type StoryAnimationMode = "normal" | "reduced";
export const STORY_CONFETTI_MS = 800;
/** Each tenfold increase doubles counting time; small totals finish promptly. */
export function totalCountDuration(value: number): number {
  return 600 * (Math.max(1, Math.abs(value)) / 10) ** Math.log10(2);
}

/** Starts moving immediately, then progressively increases digits per second. */
export function totalCountProgress(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return 0.6 * p + 0.4 * p * p;
}
const KEY = "sibble:story:animation-mode";

export function getStoryAnimationMode(): StoryAnimationMode {
  if (typeof window === "undefined") return "normal";
  return window.localStorage.getItem(KEY) === "reduced" ? "reduced" : "normal";
}

export function setStoryAnimationMode(mode: StoryAnimationMode) {
  window.localStorage.setItem(KEY, mode);
}

/** Reduced presentation uses authoritative per-word totals, never recalculates scoring. */
export function animationEvents(events: ScoreEvent[], mode: StoryAnimationMode): ScoreEvent[] {
  return mode === "normal" ? events : events.filter(event => event.type === "word" || event.type === "result");
}