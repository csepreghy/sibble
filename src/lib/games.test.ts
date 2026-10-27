import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mock } from "bun:test";

let inserted: Record<string, unknown> | undefined;
mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "games") throw new Error("Practice must not require an admin-role lookup");
      return {
        insert: (row: Record<string, unknown>) => {
          inserted = row;
          return { select: () => ({ single: async () => ({ data: { id: "practice", ...row }, error: null }) }) };
        },
      };
    },
  },
}));

test("a regular signed-in user can create active solo practice without an admin check", async () => {
  const { createGame } = await import("./games");
  const userId = "11111111-1111-4111-8111-111111111111";
  const game = await createGame({ userId, name: "Regular player", solo: true });
  assert.equal(game.solo, true);
  assert.equal(game.status, "active");
  assert.equal(inserted?.['created_by'], userId);
  assert.equal(inserted?.['player1'], userId);
  assert.equal(game.state.racks[0].length, 7);
});