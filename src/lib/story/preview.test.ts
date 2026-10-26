import { test } from "node:test";
import { strict as assert } from "node:assert";
import { inspectPlacement } from "./preview";
import { scorePlacement } from "./scoring";
import { validateStoryMove } from "./placement";

const fixture = {
  size: 5, board: Array(25).fill(null),
  pending: [{ index: 12, tileId: "i", letter: "I", blank: false }, { index: 13, tileId: "t", letter: "T", blank: false }],
  tiles: [{ id: "i", letter: "I", enhancement: null }, { id: "t", letter: "T", enhancement: null }],
  premiums: { 12: "DW" as const }, usedPremiums: [], plotTwist: null,
  letterUpgrades: {}, wordLengthUpgrades: {}, pens: [{ penId: "short-circuit", bonus: 0 }], longestThisPage: 0,
};
test("valid IT previews 8 Ink before the short-circuit Pen doubles it", () => {
  const result = inspectPlacement(fixture, word => word === "IT");
  assert.equal(result.ink, 8);
  assert.equal(scorePlacement({ ...fixture, words: [{ word: "IT", indices: [12, 13] }] }).totalInk, 16);
  assert.deepEqual(result.validIndices, [12, 13]);
});
test("invalid words have an X-ready error and invalid word indices, without Ink", () => {
  const result = inspectPlacement(fixture, () => false);
  assert.equal(result.ink, null);
  assert.deepEqual(result.invalidIndices, [12, 13]);
  assert.ok(result.error);
});
test("pre-Pen preview retains tile enhancements and word-length upgrades", () => {
  const result = inspectPlacement({ ...fixture, tiles: [{ id: "i", letter: "I", enhancement: "TL" }, { id: "t", letter: "T", enhancement: null }], wordLengthUpgrades: { 2: 1 } }, () => true);
  assert.equal(result.ink, 24);
});
test("one physical letter cannot occupy two squares", () => {
  const placements = [{ index: 12, tileId: "i", letter: "I", blank: false }, { index: 13, tileId: "i", letter: "I", blank: false }];
  assert.deepEqual(validateStoryMove(fixture.board, 5, placements, () => true), { error: "A letter tile can only be used once." });
});