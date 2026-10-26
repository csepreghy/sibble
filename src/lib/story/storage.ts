// Story runs are singleplayer and live in localStorage.

import type { StoryState } from "./types";

const KEY = "sibble:story:v1";

export function loadStory(): StoryState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoryState;
    if (parsed.version !== 1 || !parsed.page) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStory(state: StoryState | null) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    // storage full or unavailable — the run just won't persist
  }
}
