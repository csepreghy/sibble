import { describe, expect, it } from "vitest";
import {
  emptyStats,
  recordPageCompleted,
  recordStoryEnded,
  recordStoryStarted,
  recordWordsPlayed,
  topLetters,
} from "./stats";
import { newStory } from "./engine";

describe("story stats", () => {
  it("counts words, ink and letters for every scored word", () => {
    const stats = recordWordsPlayed(emptyStats(), [
      { word: "CAT", ink: 10 },
      { word: "AT", ink: 4 },
    ]);
    expect(stats.wordsPlayed).toBe(2);
    expect(stats.totalInk).toBe(14);
    expect(stats.letterCounts).toEqual({ C: 1, A: 2, T: 2 });
  });

  it("tracks the longest word by length and the best word by Ink", () => {
    let stats = recordWordsPlayed(emptyStats(), [{ word: "QI", ink: 30 }]);
    stats = recordWordsPlayed(stats, [{ word: "APPLE", ink: 12 }]);
    stats = recordWordsPlayed(stats, [{ word: "BANANA", ink: 50 }]);
    expect(stats.longestWord).toEqual({ word: "BANANA", ink: 50 });
    expect(stats.bestWord).toEqual({ word: "BANANA", ink: 50 });
  });

  it("keeps the earlier word when a later word ties on length or Ink", () => {
    let stats = recordWordsPlayed(emptyStats(), [{ word: "CAT", ink: 10 }]);
    stats = recordWordsPlayed(stats, [{ word: "DOG", ink: 10 }]);
    expect(stats.longestWord?.word).toBe("CAT");
    expect(stats.bestWord?.word).toBe("CAT");
  });

  it("tracks the highest page score across pages", () => {
    let stats = recordPageCompleted(emptyStats(), 0, 40);
    stats = recordPageCompleted(stats, 1, 65);
    stats = recordPageCompleted(stats, 2, 50);
    expect(stats.pagesCompleted).toBe(3);
    expect(stats.bestPage).toEqual({ pageIndex: 1, ink: 65 });
  });

  it("returns the top 3 most used letters, ties alphabetical", () => {
    const stats = recordWordsPlayed(emptyStats(), [
      { word: "EEAA", ink: 4 },
      { word: "EAL", ink: 3 },
      { word: "TZ", ink: 20 },
    ]);
    expect(topLetters(stats, 3)).toEqual([
      { letter: "A", count: 3 },
      { letter: "E", count: 3 },
      { letter: "L", count: 1 },
    ]);
  });

  it("records started and finished Stories, capping history at 20", () => {
    let stats = recordStoryStarted(emptyStats());
    expect(stats.storiesStarted).toBe(1);
    const run = { ...newStory(), pagesCompleted: 2, totalInk: 120, bestWord: { word: "CAT", ink: 10 } };
    stats = recordStoryEnded(stats, run, true);
    stats = recordStoryEnded(stats, run, false);
    expect(stats.storiesWon).toBe(1);
    expect(stats.storiesLost).toBe(1);
    expect(stats.finished).toHaveLength(2);
    expect(stats.finished[0]!.result).toBe("defeat");
    expect(stats.finished[1]!.result).toBe("victory");
    for (let i = 0; i < 25; i++) stats = recordStoryEnded(stats, run, true);
    expect(stats.finished).toHaveLength(20);
  });
});
