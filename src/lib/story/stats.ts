// Per-device Story statistics, persisted across runs in localStorage.

import type { StoryState } from "./types";

const KEY = "sibble:story:stats:v1";
const HISTORY_LIMIT = 20;

export interface FinishedStory {
  endedAt: string; // ISO date
  result: "victory" | "defeat";
  pagesCompleted: number;
  totalInk: number;
  bestWord: { word: string; ink: number } | null;
}

export interface StoryStats {
  version: 1;
  storiesStarted: number;
  storiesWon: number;
  storiesLost: number;
  pagesCompleted: number;
  totalInk: number;
  wordsPlayed: number;
  longestWord: { word: string; ink: number } | null;
  bestWord: { word: string; ink: number } | null;
  bestPage: { pageIndex: number; ink: number } | null;
  letterCounts: Record<string, number>;
  finished: FinishedStory[];
}

export function emptyStats(): StoryStats {
  return {
    version: 1,
    storiesStarted: 0,
    storiesWon: 0,
    storiesLost: 0,
    pagesCompleted: 0,
    totalInk: 0,
    wordsPlayed: 0,
    longestWord: null,
    bestWord: null,
    bestPage: null,
    letterCounts: {},
    finished: [],
  };
}

export function loadStoryStats(): StoryStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as StoryStats;
    if (parsed.version !== 1) return emptyStats();
    return { ...emptyStats(), ...parsed };
  } catch {
    return emptyStats();
  }
}

export function saveStoryStats(stats: StoryStats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // storage full or unavailable — stats just won't persist
  }
}

export function recordStoryStarted(stats: StoryStats): StoryStats {
  return { ...stats, storiesStarted: stats.storiesStarted + 1 };
}

/** Records every scored word of a committed move (including crosswords). */
export function recordWordsPlayed(
  stats: StoryStats,
  words: { word: string; ink: number }[],
): StoryStats {
  const next: StoryStats = { ...stats, letterCounts: { ...stats.letterCounts } };
  for (const { word, ink } of words) {
    next.wordsPlayed += 1;
    next.totalInk += ink;
    for (const ch of word.toUpperCase()) {
      if (ch >= "A" && ch <= "Z") {
        next.letterCounts[ch] = (next.letterCounts[ch] ?? 0) + 1;
      }
    }
    if (!next.longestWord || word.length > next.longestWord.word.length) {
      next.longestWord = { word, ink };
    }
    if (!next.bestWord || ink > next.bestWord.ink) {
      next.bestWord = { word, ink };
    }
  }
  return next;
}

export function recordPageCompleted(stats: StoryStats, pageIndex: number, ink: number): StoryStats {
  const bestPage = !stats.bestPage || ink > stats.bestPage.ink ? { pageIndex, ink } : stats.bestPage;
  return { ...stats, pagesCompleted: stats.pagesCompleted + 1, bestPage };
}

export function recordStoryEnded(stats: StoryStats, state: StoryState, won: boolean): StoryStats {
  const entry: FinishedStory = {
    endedAt: new Date().toISOString(),
    result: won ? "victory" : "defeat",
    pagesCompleted: state.pagesCompleted,
    totalInk: state.totalInk,
    bestWord: state.bestWord,
  };
  return {
    ...stats,
    storiesWon: stats.storiesWon + (won ? 1 : 0),
    storiesLost: stats.storiesLost + (won ? 0 : 1),
    finished: [entry, ...stats.finished].slice(0, HISTORY_LIMIT),
  };
}

/** Most-used letters across all Stories, most frequent first (ties alphabetical). */
export function topLetters(stats: StoryStats, count: number): { letter: string; count: number }[] {
  return Object.entries(stats.letterCounts)
    .map(([letter, used]) => ({ letter, count: used }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter))
    .slice(0, count);
}
