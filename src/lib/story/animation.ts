import type { ScoreEvent } from "./scoring";

export type StoryAnimationMode = "normal" | "reduced";
export const STORY_CONFETTI_MS = 800;
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