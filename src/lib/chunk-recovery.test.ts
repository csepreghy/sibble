import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isChunkLoadError, recoverChunkLoad } from "./chunk-recovery";

test("recognizes stale route chunks without treating unrelated errors as reload requests", () => {
  assert.equal(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/story_.stats-old.js")), true);
  assert.equal(isChunkLoadError(new TypeError("Importing a module script failed.")), true);
  assert.equal(isChunkLoadError(new Error("Invalid saved story")), false);
});

test("server-side recovery never accesses browser state", () => {
  assert.equal(recoverChunkLoad(new Error("Failed to fetch dynamically imported module")), false);
});