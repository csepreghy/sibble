import { test } from "node:test";
import { strict as assert } from "node:assert";
import { continueToNextPage, newStory, playPlacement } from "./engine";
import { restorePageHistory } from "./history";
import type { PlayResult } from "./engine";

function completeFirstPage(): PlayResult {
  const state = newStory();
  state.page.rack = ["S-0", "T-0", "A-0", "R-0", "E-0"];
  state.page.wordsLeft = 1;
  const result = playPlacement(state, [
    { index: 10, tileId: "S-0", letter: "S", blank: false },
    { index: 11, tileId: "T-0", letter: "T", blank: false },
    { index: 12, tileId: "A-0", letter: "A", blank: false },
    { index: 13, tileId: "R-0", letter: "R", blank: false },
    { index: 14, tileId: "E-0", letter: "E", blank: false },
  ], word => word === "STARE");
  if ("error" in result) throw new Error(result.error);
  return result;
}

test("completed pages preserve the board, played words and all four page stats", () => {
  const result = completeFirstPage();
  const page = result.state.completedPages?.[0];
  assert.ok(page);
  assert.equal(page.pageIndex, 0);
  assert.equal(page.board[12]?.letter, "A");
  assert.deepEqual(page.playedWords, [{ word: "STARE", base: 5, mult: 9, ink: 45, move: 1 }]);
  assert.equal(page.ink, 45);
  assert.equal(page.words, 1);
  assert.equal(page.bestWordInk, 45);
  assert.equal(page.coins, result.coinReward);
  assert.equal(result.state.coins, result.coinReward);
});

test("page review survives next page and future upgrades without changing its original board", () => {
  const state = completeFirstPage().state;
  const next = continueToNextPage(state);
  next.letterUpgrades["A"] = 9;
  const tile = next.tiles.find(tile => tile.id === "A-0");
  if (tile) tile.enhancement = "TW";
  assert.equal(next.pageIndex, 1);
  assert.equal(next.page.board.length, 49);
  assert.ok(next.page.board.every(cell => cell === null));
  assert.equal(next.completedPages?.[0]?.board.length, 25);
  assert.equal(next.completedPages?.[0]?.letterUpgrades["A"], undefined);
  assert.equal(next.completedPages?.[0]?.tiles.find(tile => tile.id === "A-0")?.enhancement, null);
});

test("older saves recover a still-available completed page, never invent earlier boards", () => {
  const state = completeFirstPage().state;
  delete state.completedPages;
  const restored = restorePageHistory(state);
  assert.equal(restored.completedPages?.length, 1);
  assert.equal(restored.completedPages?.[0]?.ink, 45);
  assert.equal(restorePageHistory(restored).completedPages?.length, 1);
  delete state.completedPages;
  const playing = continueToNextPage(state);
  assert.deepEqual(restorePageHistory(playing).completedPages, []);
});

test("unfinished pages record words but do not appear among completed pages", () => {
  const state = newStory();
  state.page.rack = ["I-0", "T-0"];
  const result = playPlacement(state, [
    { index: 12, tileId: "I-0", letter: "I", blank: false },
    { index: 13, tileId: "T-0", letter: "T", blank: false },
  ], word => word === "IT");
  if ("error" in result) throw new Error(result.error);
  assert.equal(result.pageCompleted, false);
  assert.equal(result.state.page.playedWords?.[0]?.word, "IT");
  assert.deepEqual(result.state.completedPages, []);
});