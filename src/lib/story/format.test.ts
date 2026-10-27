import { describe, expect, it } from "vitest";
import { compactNumber } from "./format";

describe("compactNumber", () => {
  it("keeps 1,200", () => expect(compactNumber(1200)).toBe("1,200"));
  it("keeps 12,500", () => expect(compactNumber(12500)).toBe("12,500"));
  it("150,000 → 150K", () => expect(compactNumber(150000)).toBe("150K"));
  it("1,250,000 → 1.25M", () => expect(compactNumber(1250000)).toBe("1.25M"));
  it("7,365,772,260 → 7.37B", () => expect(compactNumber(7365772260)).toBe("7.37B"));
});
