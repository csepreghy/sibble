import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compactNumber } from "./format";

test("1,200 stays exact", () => assert.equal(compactNumber(1200), "1,200"));
test("12,500 stays exact", () => assert.equal(compactNumber(12500), "12,500"));
test("150,000 → 150K", () => assert.equal(compactNumber(150000), "150K"));
test("1,250,000 → 1.25M", () => assert.equal(compactNumber(1250000), "1.25M"));
test("7,365,772,260 → 7.37B", () => assert.equal(compactNumber(7365772260), "7.37B"));
