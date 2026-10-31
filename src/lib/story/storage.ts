// Story runs are singleplayer and live in localStorage.

import type { StoryState } from "./types";
import { loadStoryStats, saveStoryStats } from "./stats";
import { restorePageHistory } from "./history";

const KEY = "sibble:story:v1";

export function loadStory(): StoryState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoryState;
    if (parsed.version !== 1 || !parsed.page) return null;
    if (!parsed.runId) {
      parsed.runId = crypto.randomUUID();
      if (parsed.phase === "victory") {
        const stats = loadStoryStats();
        // Older builds recorded victory before saving the terminal run.
        const previous = stats.finished.find(entry => entry.result === "victory" && entry.totalInk === parsed.totalInk && entry.pagesCompleted === parsed.pagesCompleted);
        if (previous) {
          previous.runId = parsed.runId;
          saveStoryStats({ ...stats, victoryRunIds: [...stats.victoryRunIds, parsed.runId] });
        }
      }
      saveStory(parsed);
    }
    return restorePageHistory(parsed);
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
