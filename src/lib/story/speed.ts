// Presentation-only scoring animation speed (per device). Never affects scoring.
export const STORY_SPEEDS = [1, 1.5, 2, 3] as const;
const KEY = "sibble:story:anim-speed";

export function getStorySpeed(): number {
  if (typeof window === "undefined") return 1;
  const v = Number(window.localStorage.getItem(KEY));
  return (STORY_SPEEDS as readonly number[]).includes(v) ? v : 1;
}

export function setStorySpeed(v: number) {
  window.localStorage.setItem(KEY, String(v));
}

/** Scale a duration (ms) by the chosen speed. */
export function scaled(ms: number) {
  return ms / getStorySpeed();
}

export function nextStorySpeed(current: number) {
  const i = (STORY_SPEEDS as readonly number[]).indexOf(current);
  return STORY_SPEEDS[(i + 1) % STORY_SPEEDS.length] ?? 1;
}
