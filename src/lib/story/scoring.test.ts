import { test } from "node:test";
import { strict as assert } from "node:assert";
import { baseWordMult, scorePlacement, wordLengthMult } from "./scoring";
import { PAGES } from "./boards";
import { generateOffers, newStory } from "./engine";
import type { Enhancement, PenInstance, PlotTwist, StoryTile } from "./types";

const SIZE = 15;
const ROW = 7 * SIZE; // centre row of a 15×15 board

interface Spec {
  word: string;
  /** board index of the first letter (across) */
  start?: number;
  /** positions (0-based within word) already on the board */
  existing?: number[];
  enh?: Record<number, Enhancement>;
  premiums?: Record<number, Enhancement>;
  usedPremiums?: number[];
  pens?: string[];
  bonuses?: Record<string, number>;
  plotTwist?: PlotTwist;
  letterUpgrades?: Record<string, number>;
  extraWords?: number;
  longest?: number;
  wordLengthUpgrades?: Record<number, number>;
  first?: boolean;
}

function score(spec: Spec) {
  const start = spec.start ?? ROW + 6;
  const tiles: StoryTile[] = [];
  const board = Array(SIZE * SIZE).fill(null);
  const pending = [];
  const indices: number[] = [];
  for (let i = 0; i < spec.word.length; i++) {
    const letter = spec.word[i]!;
    const id = `t${i}`;
    const index = start + i;
    indices.push(index);
    tiles.push({ id, letter, enhancement: spec.enh?.[i] ?? null });
    if (spec.existing?.includes(i)) board[index] = { tileId: id, letter, blank: false };
    else pending.push({ index, tileId: id, letter, blank: false });
  }
  const words = [{ word: spec.word, indices }];
  for (let i = 0; i < (spec.extraWords ?? 0); i++) words.push({ word: spec.word, indices });
  const pens: PenInstance[] = (spec.pens ?? []).map((penId) => ({ penId, bonus: spec.bonuses?.[penId] ?? 0 }));
  return scorePlacement({
    words, size: SIZE, board, pending, tiles,
    premiums: spec.premiums ?? {}, usedPremiums: spec.usedPremiums ?? [],
    plotTwist: spec.plotTwist ?? null, letterUpgrades: spec.letterUpgrades ?? {},
    wordLengthUpgrades: spec.wordLengthUpgrades ?? {}, pens, longestThisPage: spec.longest ?? 99,
    firstMoveOfPage: spec.first ?? false,
  });
}

test("every Story board has a neutral centre", () => {
  for (const page of PAGES) {
    const center = ((page.size - 1) / 2) * page.size + (page.size - 1) / 2;
    assert.equal(page.premiums[center], undefined, `${page.size}×${page.size}`);
  }
});

test("CAT across the neutral centre scores 15", () => {
  assert.equal(score({ word: "CAT", premiums: PAGES[7]!.premiums }).totalInk, 15);
});

test("accelerating word-length multipliers", () => {
  assert.deepEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 15].map(baseWordMult), [2, 3, 5, 9, 16, 28, 45, 70, 105, 560]);
  assert.equal(score({ word: "TEAS" }).totalInk, 20);
  assert.equal(score({ word: "STARE" }).totalInk, 45);
  assert.equal(score({ word: "RETAINS" }).totalInk, 196);
});

test("Pen combinations on CAT", () => {
  assert.equal(score({ word: "CAT", pens: ["catnip"] }).totalInk, 65);
  assert.equal(score({ word: "CAT", pens: ["catnip", "short-circuit"] }).totalInk, 130);
  assert.equal(score({ word: "CAT", pens: ["minimalist", "catnip", "short-circuit"] }).totalInk, 520);
});

test("DL/TL tile and square stack multiplicatively", () => {
  const c = ROW + 6;
  assert.equal(score({ word: "CAT", enh: { 0: "DL" }, premiums: { [c]: "DL" } }).totalInk, 42);
  assert.equal(score({ word: "CAT", enh: { 0: "DL" }, premiums: { [c]: "TL" } }).totalInk, 60);
  assert.equal(score({ word: "CAT", enh: { 0: "TL" }, premiums: { [c]: "TL" } }).words[0]!.base, 27 + 2);
});

test("Echo Chamber retriggers a reused TW enhancement", () => {
  assert.equal(score({ word: "BE", existing: [1], enh: { 1: "TW" } }).totalInk, 24);
  assert.equal(score({ word: "BE", existing: [1], enh: { 1: "TW" }, pens: ["echo-chamber"] }).totalInk, 90);
});

test("two TW-enhanced letters multiply", () => {
  assert.equal(score({ word: "CAT", enh: { 0: "TW", 2: "TW" } }).totalInk, 5 * 3 * 9);
});

test("all copies of an enhanced letter type are enhanced", () => {
  const story = newStory();
  assert.ok(story.tiles.filter((t) => t.letter === "E").length > 1);
});

test("an enhanced tile reused in another word activates again", () => {
  assert.equal(score({ word: "CAT", existing: [0], enh: { 0: "DL" } }).totalInk, 24);
});

test("previously activated premium squares don't retrigger", () => {
  const c = ROW + 6;
  assert.equal(score({ word: "CAT", premiums: { [c]: "TL" }, usedPremiums: [c] }).totalInk, 15);
  assert.equal(score({ word: "CAT", existing: [0], premiums: { [c]: "TL" } }).totalInk, 15);
});

test("multiple words in one placement each score", () => {
  assert.equal(score({ word: "CAT", extraWords: 1 }).totalInk, 30);
});

test("Plot Twists", () => {
  assert.equal(score({ word: "CAT", plotTwist: "silent-vowels" }).totalInk, 12);
  assert.equal(score({ word: "CAT", plotTwist: "silent-consonants" }).totalInk, 3);
  assert.equal(score({ word: "CAT", plotTwist: "fading-ink" }).totalInk, 7);
});

test("The Linguist retriggers Pens once and scaling gains happen once", () => {
  assert.equal(score({ word: "CAT", pens: ["linguist", "catnip"], longest: 0 }).totalInk, 5 * 13);
  const gain = score({ word: "STARE", pens: ["linguist", "growing-vocabulary"], longest: 0 });
  assert.equal(gain.penGains["growing-vocabulary"], 1);
});

test("Pen order does not change the score", () => {
  const pens = ["minimalist", "catnip", "short-circuit", "echo-chamber"];
  const a = score({ word: "CAT", existing: [1], enh: { 1: "TW" }, pens }).totalInk;
  const b = score({ word: "CAT", existing: [1], enh: { 1: "TW" }, pens: [...pens].reverse() }).totalInk;
  assert.equal(a, b);
});

test("event sequence ends at the computed Ink", () => {
  const result = score({ word: "CAT", existing: [1], enh: { 0: "DL", 1: "TW" }, pens: ["echo-chamber", "catnip"], extraWords: 1 });
  const results = result.events.filter((e) => e.type === "result");
  assert.equal(results.reduce((sum, e) => sum + (e.type === "result" ? e.ink : 0), 0), result.totalInk);
  const lastMult = [...result.events].reverse().find((e) => "runningMult" in e);
  assert.ok(lastMult && "runningMult" in lastMult && lastMult.runningMult === result.words[1]!.mult);
});

test("Bookstore offers rare letters and long word-length upgrades", () => {
  const story = newStory();
  const letters = new Set<string>();
  const lengths = new Set<number>();
  for (let i = 0; i < 400; i++) {
    const offers = generateOffers({ ...story, pageIndex: 6 });
    const letterOffers = offers.filter((o) => o.kind === "letter");
    assert.equal(letterOffers.length, 2);
    assert.notEqual(letterOffers[0]!.kind === "letter" && letterOffers[0]!.letter, letterOffers[1]!.kind === "letter" && letterOffers[1]!.letter);
    for (const o of offers) {
      if (o.kind === "letter") letters.add(o.letter);
      if (o.kind === "word-length") lengths.add(o.length);
    }
  }
  assert.ok(["Q", "Z", "J", "X"].some((l) => letters.has(l)));
  assert.ok([...lengths].some((l) => l > 8));
  for (let i = 0; i < 100; i++) {
    const early = generateOffers({ ...story, pageIndex: 0 }).find((o) => o.kind === "word-length");
    assert.ok(early && early.kind === "word-length" && early.length <= 7);
  }
});

// --- Normal 2.0 -----------------------------------------------------------
// COAT base 3+1+1+1=6, ×5. STARE base 1+1+1+1+1=5, ×9. BOOK base 3+1+1+5=10.

test("Columnist ×3 only for exactly 4 letters", () => {
  assert.equal(score({ word: "COAT", pens: ["columnist"] }).totalInk, 6 * 15);
  assert.equal(score({ word: "STARE", pens: ["columnist"] }).totalInk, 45);
  assert.equal(score({ word: "COAT", pens: ["columnist", "short-circuit"] }).totalInk, 6 * 30);
});

test("Novelist ×4 only for exactly 5 letters", () => {
  assert.equal(score({ word: "STARE", pens: ["novelist"] }).totalInk, 5 * 36);
  assert.equal(score({ word: "COAT", pens: ["novelist"] }).totalInk, 30);
});

test("Fresh Ink and Typesetter count only newly placed letters", () => {
  assert.equal(score({ word: "COAT", existing: [0, 1], pens: ["fresh-ink"] }).totalInk, (6 + 8) * 5);
  assert.equal(score({ word: "COAT", existing: [0, 1], pens: ["typesetter"] }).totalInk, 6 * 15);
  assert.equal(score({ word: "CAT", pens: ["fresh-ink", "typesetter"] }).totalInk, 15);
});

test("Lexicographer and Double Trouble detect repeats", () => {
  assert.equal(score({ word: "STARE", pens: ["lexicographer"] }).totalInk, 90);
  assert.equal(score({ word: "BOOK", pens: ["lexicographer"] }).totalInk, 50);
  assert.equal(score({ word: "BOOK", pens: ["double-trouble"] }).totalInk, 100);
  assert.equal(score({ word: "STARE", pens: ["double-trouble"] }).totalInk, 45);
});

test("Rewriter needs 2+ reused letters", () => {
  assert.equal(score({ word: "COAT", existing: [0, 1], pens: ["rewriter"] }).totalInk, 60);
  assert.equal(score({ word: "COAT", existing: [0], pens: ["rewriter"] }).totalInk, 30);
});

test("Rare Talent triples J, Q, X, Z and respects Silent Consonants", () => {
  // ZA: 10+1=11 → Z×3 = 31, ×2
  assert.equal(score({ word: "ZA", pens: ["rare-talent"] }).totalInk, 62);
  assert.equal(score({ word: "ZA", pens: ["rare-talent"], enh: { 0: "DL" } }).totalInk, (60 + 1) * 2);
  assert.equal(score({ word: "ZA", pens: ["rare-talent"], plotTwist: "silent-consonants" }).totalInk, 2);
});

test("First Edition only for a 5+ letter first word", () => {
  assert.equal(score({ word: "STARE", pens: ["first-edition"], first: true }).totalInk, 135);
  assert.equal(score({ word: "STARE", pens: ["first-edition"], first: false }).totalInk, 45);
  assert.equal(score({ word: "COAT", pens: ["first-edition"], first: true }).totalInk, 30);
});

test("Longform gains +3 per 5+ word, applying only to later words", () => {
  const r = score({ word: "STARE", pens: ["longform"], bonuses: { longform: 0 } });
  assert.equal(r.totalInk, 45);
  assert.equal(r.penGains["longform"], 3);
  assert.equal(score({ word: "STARE", pens: ["longform"], bonuses: { longform: 6 } }).totalInk, 5 * 15);
  assert.equal(score({ word: "COAT", pens: ["longform"], bonuses: { longform: 6 } }).totalInk, 30);
  const re = score({ word: "STARE", pens: ["longform", "linguist"], bonuses: { longform: 3 }, longest: 0 });
  assert.equal(re.penGains["longform"], 3);
  assert.equal(re.totalInk, 5 * 15); // 9 + 3 + 3 (retrigger)
});

test("Linguist needs a strictly longer record of 4+ letters", () => {
  assert.equal(score({ word: "CAT", pens: ["linguist", "catnip"], longest: 2 }).totalInk, 65);
  assert.equal(score({ word: "COAT", pens: ["linguist", "columnist"], longest: 3 }).totalInk, 6 * 45);
  assert.equal(score({ word: "COAT", pens: ["linguist", "columnist"], longest: 0 }).totalInk, 6 * 45);
  assert.equal(score({ word: "STARE", pens: ["linguist", "novelist"], longest: 5 }).totalInk, 5 * 36);
  assert.equal(score({ word: "STARE", pens: ["linguist", "novelist"], longest: 4 }).totalInk, 5 * 144);
});

test("word-length upgrades add a fixed 20% of the original Mult, rounded up", () => {
  const table: [number, number, number][] = [[2, 3, 4], [3, 4, 5], [4, 6, 7], [5, 11, 13], [6, 20, 24], [7, 34, 40], [8, 54, 63], [9, 84, 98], [10, 126, 147]];
  for (const [len, one, two] of table) {
    assert.equal(wordLengthMult(len, { [len]: 1 }), one);
    assert.equal(wordLengthMult(len, { [len]: 2 }), two);
  }
  assert.equal(wordLengthMult(5, { 5: 3 }), 15);
  assert.equal(score({ word: "STARE", wordLengthUpgrades: { 5: 1 } }).totalInk, 55);
});
