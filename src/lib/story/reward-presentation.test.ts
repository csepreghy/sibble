import assert from "node:assert/strict";
import { test } from "node:test";
import { pageExcessPercent } from "./reward-presentation";

test("excess percentage reflects actual Ink, not qualifying bonus increments", () => {
  assert.equal(pageExcessPercent(1250, 1000), 25);
});

test("excess percentage remains uncapped when Page Bonus reaches its cap", () => {
  assert.equal(pageExcessPercent(1800, 1000), 80);
});

test("meeting the target has zero excess", () => {
  assert.equal(pageExcessPercent(1000, 1000), 0);
});

test("fractional excess is preserved for concise presentation", () => {
  assert.equal(pageExcessPercent(1105, 1000), 10.5);
});