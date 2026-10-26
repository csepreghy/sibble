import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { storyLayout } from "./layout";

describe("SibbleBook layout selection", () => {
  test("wide landscape preserves desktop", () => {
    assert.equal(storyLayout(1100, 800, false), "desktop");
    assert.equal(storyLayout(1440, 900, false), "desktop");
  });
  test("every portrait viewport uses compact play", () => {
    assert.equal(storyLayout(390, 664, true), "compact");
    assert.equal(storyLayout(834, 1194, false), "compact");
    assert.equal(storyLayout(1200, 1600, false), "compact");
  });
  test("narrow landscape phones ask for portrait", () => {
    assert.equal(storyLayout(844, 390, true), "rotate");
  });
  test("narrow desktops and tablets never require rotation", () => {
    assert.equal(storyLayout(900, 700, false), "compact");
    assert.equal(storyLayout(1024, 768, false), "compact");
  });
});