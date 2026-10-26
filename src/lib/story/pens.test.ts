import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { reorderPens } from "./pens";

describe("owned Pen ordering", () => {
  const pens = [{ penId: "catnip", bonus: 0 }, { penId: "growing-vocabulary", bonus: 8 }, { penId: "short-circuit", bonus: 0 }];
  it("moves a Pen to the dropped position while preserving all bonuses and the original list", () => {
    const result = reorderPens(pens, "catnip", "short-circuit");
    assert.deepEqual(result, [pens[1], pens[2], pens[0]]);
    assert.equal(result[0]?.bonus, 8);
    assert.deepEqual(pens.map((pen) => pen.penId), ["catnip", "growing-vocabulary", "short-circuit"]);
  });
  it("moves a Pen backwards", () => {
    assert.deepEqual(reorderPens(pens, "short-circuit", "catnip"), [pens[2], pens[0], pens[1]]);
  });
  it("ignores missing targets or drops on the same Pen", () => {
    assert.equal(reorderPens(pens, "catnip", "missing"), pens);
    assert.equal(reorderPens(pens, "catnip", "catnip"), pens);
  });
});