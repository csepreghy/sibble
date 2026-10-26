import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buyOffer, newStory } from "./engine";
import type { Enhancement, StoryState } from "./types";

/** Bookstore with a single enhancement offer and enough Coins to buy it. */
function shopWith(enhancement: Enhancement): StoryState {
  const base = newStory();
  return {
    ...base,
    coins: 20,
    offers: [{ kind: "enhancement", enhancement, price: 4, sold: false }],
  };
}

test("an enhancement offer asks for a letter before any Coins are taken", () => {
  const state = shopWith("DL");
  const result = buyOffer(state, 0);
  assert.ok("needsLetter" in result, "expected the Bookstore to ask for a letter");
  assert.equal(result.needsLetter.coins, 20);
});

test("buying an enhancement applies it to every tile of the chosen letter", () => {
  const state = shopWith("DL");
  const result = buyOffer(state, 0, "S");
  if ("error" in result) throw new Error(result.error);
  const sTiles = result.tiles.filter((tile) => tile.letter === "S");
  assert.equal(sTiles.length, 4, "the Story owns four S tiles");
  assert.ok(sTiles.every((tile) => tile.enhancement === "DL"), "every S tile is enhanced");
  assert.equal(result.tiles.filter((tile) => tile.letter !== "S" && tile.enhancement).length, 0);
  assert.equal(result.coins, 16);
  assert.equal(result.offers?.[0]?.sold, true);
});

test("blanks keep no enhancement when a letter is enhanced", () => {
  const state = shopWith("TW");
  const result = buyOffer(state, 0, "A");
  if ("error" in result) throw new Error(result.error);
  assert.equal(result.tiles.filter((tile) => tile.letter === "?" && tile.enhancement).length, 0);
  assert.ok(result.tiles.filter((tile) => tile.letter === "A").every((tile) => tile.enhancement === "TW"));
});

test("choosing an enhanced letter replaces its enhancement", () => {
  const state: StoryState = {
    ...shopWith("DL"),
    tiles: newStory().tiles.map((tile) => (tile.letter === "E" ? { ...tile, enhancement: "TW" as const } : tile)),
  };
  const result = buyOffer(state, 0, "E");
  if ("error" in result) throw new Error(result.error);
  const eTiles = result.tiles.filter((tile) => tile.letter === "E");
  assert.equal(eTiles.length, 12, "the Story owns twelve E tiles");
  assert.ok(eTiles.every((tile) => tile.enhancement === "DL"));
});

test("a letter that has no tiles is rejected without spending Coins", () => {
  const state = shopWith("DL");
  const result = buyOffer(state, 0, "1");
  assert.ok("error" in result, "expected a rejection");
  assert.equal(state.coins, 20, "the Bookstore never charged");
});
