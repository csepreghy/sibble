import { test } from "node:test";
import { strict as assert } from "node:assert";
import { inspectPlacement } from "./preview";

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
  assert.deepEqual(result.validIndices, [12, 13]);
});
test("invalid words have an X-ready error and invalid word indices, without Ink", () => {
  const result = inspectPlacement(fixture, () => false);
  assert.equal(result.ink, null);
  assert.deepEqual(result.invalidIndices, [12, 13]);
  assert.ok(result.error);
});
test("pre-Pen preview retains tile enhancements and word-length upgrades", () => {
  const result = inspectPlacement({ ...fixture, tiles: [{ id: "i", letter: "I", enhancement: "TL" }, fixture.tiles[1]], wordLengthUpgrades: { 2: 1 } }, () => true);
  assert.equal(result.ink, 24);
});