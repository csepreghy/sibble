import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  emptyStats,
  recordPageCompleted,
  recordStoryEnded,
  recordStoryStarted,
  recordWordsPlayed,
  topLetters,
} from "./stats";
import { newStory } from "./engine";

test("counts words, ink and letters for every scored word", () => {
  const stats = recordWordsPlayed(emptyStats(), [
    { word: "CAT", ink: 10 },
    { word: "AT", ink: 4 },
  ]);
  assert.equal(stats.wordsPlayed, 2);
  assert.equal(stats.totalInk, 14);
  assert.deepEqual(stats.letterCounts, { C: 1, A: 2, T: 2 });
});

test("tracks the longest word by length and the best word by Ink", () => {
  let stats = recordWordsPlayed(emptyStats(), [{ word: "QI", ink: 30 }]);
  stats = recordWordsPlayed(stats, [{ word: "APPLE", ink: 12 }]);
  stats = recordWordsPlayed(stats, [{ word: "BANANA", ink: 50 }]);
  assert.deepEqual(stats.longestWord, { word: "BANANA", ink: 50 });
  assert.deepEqual(stats.bestWord, { word: "BANANA", ink: 50 });
});

test("keeps the earlier word when a later word ties on length or Ink", () => {
  let stats = recordWordsPlayed(emptyStats(), [{ word: "CAT", ink: 10 }]);
  stats = recordWordsPlayed(stats, [{ word: "DOG", ink: 10 }]);
  assert.equal(stats.longestWord?.word, "CAT");
  assert.equal(stats.bestWord?.word, "CAT");
});

test("tracks the highest page score across pages", () => {
  let stats = recordPageCompleted(emptyStats(), 0, 40);
  stats = recordPageCompleted(stats, 1, 65);
  stats = recordPageCompleted(stats, 2, 50);
  assert.equal(stats.pagesCompleted, 3);
  assert.deepEqual(stats.bestPage, { pageIndex: 1, ink: 65 });
});

test("returns the top 3 most used letters, ties alphabetical", () => {
  const stats = recordWordsPlayed(emptyStats(), [
    { word: "EEAA", ink: 4 },
    { word: "EAL", ink: 3 },
    { word: "TZ", ink: 20 },
  ]);
  assert.deepEqual(topLetters(stats, 3), [
    { letter: "A", count: 3 },
    { letter: "E", count: 3 },
    { letter: "L", count: 1 },
  ]);
});

test("records started and finished Stories, capping history at 20", () => {
  let stats = recordStoryStarted(emptyStats());
  assert.equal(stats.storiesStarted, 1);
  const run = { ...newStory(), pagesCompleted: 2, totalInk: 120, bestWord: { word: "CAT", ink: 10 } };
  stats = recordStoryEnded(stats, run, true);
  stats = recordStoryEnded(stats, run, false);
  assert.equal(stats.storiesWon, 1);
  assert.equal(stats.storiesLost, 1);
  assert.equal(stats.finished.length, 2);
  assert.equal(stats.finished[0]!.result, "defeat");
  assert.equal(stats.finished[1]!.result, "victory");
  for (let i = 0; i < 25; i++) stats = recordStoryEnded(stats, run, true);
  assert.equal(stats.finished.length, 20);
});
