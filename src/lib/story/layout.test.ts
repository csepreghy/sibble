import { describe, expect, test } from "bun:test";
import { storyLayout } from "./layout";

describe("SibbleBook layout selection", () => {
  test("wide landscape preserves desktop", () => {
    expect(storyLayout(1100, 800, false)).toBe("desktop");
    expect(storyLayout(1440, 900, false)).toBe("desktop");
  });
  test("every portrait viewport uses compact play", () => {
    expect(storyLayout(390, 664, true)).toBe("compact");
    expect(storyLayout(834, 1194, false)).toBe("compact");
    expect(storyLayout(1200, 1600, false)).toBe("compact");
  });
  test("narrow landscape phones ask for portrait", () => {
    expect(storyLayout(844, 390, true)).toBe("rotate");
  });
  test("narrow desktops and tablets never require rotation", () => {
    expect(storyLayout(900, 700, false)).toBe("compact");
    expect(storyLayout(1024, 768, false)).toBe("compact");
  });
});