import { test } from "node:test";
import { strict as assert } from "node:assert";
import { animationEvents, STORY_CONFETTI_MS, totalCountDuration, totalCountProgress } from "./animation";
import type { ScoreEvent } from "./scoring";

const events: ScoreEvent[] = [
  { type: "word", word: "CAT", indices: [10, 11, 12] },
  { type: "letter", index: 10, letter: "C", base: 3, runningBase: 3 },
  { type: "mult-init", value: 3 },
  { type: "pen-mult", penId: "catnip", text: "+10 Mult", runningMult: 13 },
  { type: "result", word: "CAT", base: 5, mult: 13, ink: 65 },
  { type: "word", word: "IT", indices: [6, 11] },
  { type: "result", word: "IT", base: 2, mult: 2, ink: 4 },
];

test("page confetti uses its normal 0.8-second duration independently of scoring speed", () => {
  assert.equal(STORY_CONFETTI_MS, 800);
});

test("Base 10 counts faster than Mult 100 and the previous 1.5-second count", () => {
  assert.equal(totalCountDuration(10), 600);
  assert.ok(totalCountDuration(10) < totalCountDuration(100));
  assert.ok(totalCountDuration(10) < 1500);
});

test("1000 takes twice as long as 100, not ten times as long", () => {
  assert.ok(Math.abs(totalCountDuration(100) - 1200) < 0.001);
  assert.ok(Math.abs(totalCountDuration(1000) - 2400) < 0.001);
  assert.ok(Math.abs(totalCountDuration(1000) / totalCountDuration(100) - 2) < 0.001);
});

test("counting accelerates gradually and finishes at the exact authoritative total", () => {
  assert.equal(totalCountProgress(0), 0);
  assert.equal(totalCountProgress(1), 1);
  const increments = [0.25, 0.5, 0.75, 1].map(p => totalCountProgress(p) - totalCountProgress(p - 0.25));
  for (let i = 1; i < increments.length; i++) assert.ok(increments[i] > increments[i - 1]);
  assert.equal(1000 * totalCountProgress(1), 1000);
});

test("Normal keeps every existing scoring animation event", () => {
  assert.equal(animationEvents(events, "normal"), events);
});

test("Reduced skips contribution events but retains each word and its exact totals for the finale", () => {
  const reduced = animationEvents(events, "reduced");
  assert.deepEqual(reduced, [events[0], events[4], events[5], events[6]]);
  assert.deepEqual(reduced.filter(event => event.type === "result").map(event => [event.base, event.mult, event.ink]), [[5, 13, 65], [2, 2, 4]]);
  assert.equal(events.length, 7);
});