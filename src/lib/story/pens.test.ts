import { describe, expect, it } from "vitest";
import { reorderPens } from "./pens";

describe("owned Pen ordering", () => {
  const pens = [{ penId: "catnip", bonus: 0 }, { penId: "growing-vocabulary", bonus: 8 }, { penId: "short-circuit", bonus: 0 }];
  it("moves a Pen to the dropped position while preserving all bonuses and the original list", () => {
    const result = reorderPens(pens, "catnip", "short-circuit");
    expect(result).toEqual([pens[1], pens[2], pens[0]]);
    expect(result[0]?.bonus).toBe(8);
    expect(pens.map((pen) => pen.penId)).toEqual(["catnip", "growing-vocabulary", "short-circuit"]);
  });
  it("moves a Pen backwards", () => {
    expect(reorderPens(pens, "short-circuit", "catnip")).toEqual([pens[2], pens[0], pens[1]]);
  });
  it("ignores missing targets or drops on the same Pen", () => {
    expect(reorderPens(pens, "catnip", "missing")).toBe(pens);
    expect(reorderPens(pens, "catnip", "catnip")).toBe(pens);
  });
});