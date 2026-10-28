import { test } from "node:test";
import { strict as assert } from "node:assert";
import { PAGES } from "./boards";
import { buyOffer, generateOffers, newStory, sellPen, WORD_LENGTH_PRICE } from "./engine";
import { PENS, penDef } from "./pens";
import { upgradeDef, GOLDEN_PAYDAY_BONUS } from "./upgrades";

test("20 Pens with the new prices", () => {
  assert.equal(PENS.length, 20);
  const prices: Record<string, number> = {
    minimalist: 9, "vowel-power": 9, crossword: 7, "growing-vocabulary": 8, catnip: 10, "echo-chamber": 16,
    architect: 12, "vowel-collector": 11, "short-circuit": 12, linguist: 16, columnist: 12, novelist: 13,
    "fresh-ink": 10, lexicographer: 10, rewriter: 9, typesetter: 12, longform: 10, "rare-talent": 7,
    "first-edition": 10, "double-trouble": 10,
  };
  for (const [id, price] of Object.entries(prices)) assert.equal(penDef(id).price, price, id);
});

test("all 20 Pens appear, owned ones never, seven offers each", () => {
  const story = { ...newStory(), pens: [{ penId: "catnip", bonus: 0 }] };
  const seen = new Set<string>();
  for (let i = 0; i < 600; i++) {
    const offers = generateOffers(story);
    assert.equal(offers.length, 7);
    for (const o of offers) if (o.kind === "pen") seen.add(o.penId);
    const wl = offers.find((o) => o.kind === "word-length");
    assert.equal(wl?.price, WORD_LENGTH_PRICE);
  }
  assert.ok(!seen.has("catnip"));
  assert.equal(seen.size, 19);
});

test("buying and selling use the new Pen price", () => {
  const story = { ...newStory(), coins: 20, phase: "bookstore" as const, offers: [{ kind: "pen" as const, penId: "novelist", price: 13, sold: false }] };
  const bought = buyOffer(story, 0);
  assert.ok(!("error" in bought) && !("needsLetter" in bought));
  if ("coins" in bought) {
    assert.equal(bought.coins, 7);
    assert.equal(sellPen(bought, "novelist").coins, 13);
  }
});

test("Coin Upgrades costs 10 and pays +3", () => {
  assert.equal(upgradeDef("golden-payday").price, 10);
  assert.equal(GOLDEN_PAYDAY_BONUS, 3);
});

test("Ink targets and coin rewards", () => {
  assert.deepEqual(PAGES.map((p) => p.inkTarget), [30, 130, 90, 600, 1400, 450, 3500, 8500, 5000]);
  assert.deepEqual(PAGES.map((p) => p.coins), [16, 18, 20, 22, 24, 26, 28, 30, 32]);
});
