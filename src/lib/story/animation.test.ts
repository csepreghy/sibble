import { test } from "node:test";
import { strict as assert } from "node:assert";
import { animationEvents } from "./animation";
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

test("Normal keeps every existing scoring animation event", () => {
  assert.equal(animationEvents(events, "normal"), events);
});

test("Reduced skips contribution events but retains each word and its exact totals for the finale", () => {
  const reduced = animationEvents(events, "reduced");
  assert.deepEqual(reduced, [events[0], events[4], events[5], events[6]]);
  assert.deepEqual(reduced.filter(event => event.type === "result").map(event => [event.base, event.mult, event.ink]), [[5, 13, 65], [2, 2, 4]]);
  assert.equal(events.length, 7);
});