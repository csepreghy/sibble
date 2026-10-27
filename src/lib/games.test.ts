import { test, expect, mock } from "bun:test";

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
  expect(game.solo).toBe(true);
  expect(game.status).toBe("active");
  expect(inserted?.created_by).toBe(userId);
  expect(inserted?.player1).toBe(userId);
  expect(game.state.draft).toBeFalsy();
});