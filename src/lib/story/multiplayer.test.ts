import { test } from "node:test";
import { strict as assert } from "node:assert";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expect = (a: any) => ({
  toBe: (b: unknown) => assert.equal(a, b), toEqual: (b: unknown) => assert.deepEqual(a, b),
  toBeGreaterThan: (b: number) => assert.ok(a > b), not: { toContain: (b: unknown) => assert.ok(!a.includes(b)) },
});
const describe = (_: string, fn: () => void) => fn();
import { getPage } from "./boards";
import {
  abandon, buy, createMatch, joinMatch, mpOffers, mpPageCoins, passTurn, playMove, privateView, publicView, setReady,
  type MatchState, type Seat,
} from "./multiplayer";

const any = () => true;
function started(): MatchState {
  const r = joinMatch(createMatch("u1", "Ann"), "u2", "Ben", () => 0.1);
  if ("error" in r) throw new Error(r.error);
  return r.match;
}
function ok(r: { match: MatchState } | { error: string }): MatchState {
  if ("error" in r) throw new Error(r.error);
  return r.match;
}
/** Plays one tile on the centre (first move) or passes. */
function centreMove(m: MatchState, seat: Seat) {
  const size = getPage(m.pageIndex).size;
  const centre = Math.floor((size * size) / 2);
  const tile = m.players[seat]!.state.tiles.find((t) => t.id === m.players[seat]!.state.page.rack.find((id) => !id.includes("?")))!;
  const second = m.players[seat]!.state.tiles.find((t) => t.id === m.players[seat]!.state.page.rack.find((id) => id !== tile.id && !id.includes("?")))!;
  return playMove(m, seat, [
    { index: centre, tileId: tile.id, letter: tile.letter, blank: false },
    { index: centre + 1, tileId: second.id, letter: second.letter, blank: false },
  ], any);
}

describe("multiplayer Story", () => {
  test("joining rules", () => {
    const m = createMatch("u1", "Ann");
    expect(joinMatch(m, "u1", "Ann")).toEqual({ error: "You can't join your own invitation." });
    const full = ok(joinMatch(m, "u2", "Ben"));
    expect("error" in joinMatch(full, "u3", "Cy")).toBe(true);
    expect("error" in joinMatch(ok(abandon(m, 0)), "u2", "Ben")).toBe(true);
  });

  test("turn order is enforced and alternates", () => {
    const m = started();
    expect(m.turn).toBe(0);
    expect(passTurn(m, 1)).toEqual({ error: "It's not your turn." });
    const after = ok(centreMove(m, 0));
    expect(after.turn).toBe(1);
    expect(after.board.filter(Boolean).length).toBe(2);
    expect(after.players[0]!.state.page.ink).toBeGreaterThan(0);
    expect(after.players[1]!.state.page.ink).toBe(0);
  });

  test("letters must come from the player's own rack", () => {
    const m = started();
    const foreign = m.players[1]!.state.page.rack[0]!;
    const tile = m.players[1]!.state.tiles.find((t) => t.id === foreign)!;
    expect(playMove(m, 0, [{ index: 0, tileId: foreign, letter: tile.letter, blank: false }], any)).toEqual({ error: "That letter isn't on your rack." });
  });

  test("tile ids never collide between players", () => {
    const m = started();
    const a = new Set(m.players[0]!.state.tiles.map((t) => t.id));
    expect(m.players[1]!.state.tiles.some((t) => a.has(t.id))).toBe(false);
  });

  test("public view hides racks, bags and Pens", () => {
    const view = JSON.stringify(publicView(started()));
    expect(view).not.toContain("rack");
    expect(view).not.toContain("bag");
    expect(view).not.toContain("pens");
    expect(privateView(started(), 0)!.state.page.bag).toEqual([]);
  });

  test("tied Page grants one extra word each", () => {
    let m = started();
    const words = getPage(0).words;
    for (let i = 0; i < words * 2; i++) m = ok(passTurn(m, m.turn));
    expect(m.phase).toBe("play");
    expect(m.tiebreaks).toBe(1);
    expect(m.players.map((p) => p!.state.page.wordsLeft)).toEqual([1, 1]);
  });

  test("Page winner, coins, identical shops and Ready", () => {
    let m = ok(centreMove(started(), 0));
    while (m.phase === "play") m = ok(passTurn(m, m.turn));
    expect(m.phase).toBe("bookstore");
    expect(m.lastPage!.winner).toBe(0);
    const base = getPage(0).coins;
    expect(m.lastPage!.coins).toEqual([base + 4, base + 2]);
    expect(JSON.stringify(m.players[0]!.state.offers)).toBe(JSON.stringify(m.players[1]!.state.offers));
    const cheap = m.players[0]!.state.offers!.findIndex((o) => o.kind === "letter");
    const bought = ok(buy(m, 0, cheap));
    expect(bought.players[0]!.state.offers![cheap]!.sold).toBe(true);
    expect(bought.players[1]!.state.offers![cheap]!.sold).toBe(false);
    const one = ok(setReady(bought, 0));
    expect(one.phase).toBe("bookstore");
    const next = ok(setReady(one, 1));
    expect(next.phase).toBe("play");
    expect(next.pageIndex).toBe(1);
    expect(next.turn).toBe(1);
    expect(next.board.every((c) => c === null)).toBe(true);
  });

  test("rewards: win +3, lose +2, +1 for 50% more Ink", () => {
    const base = getPage(0).coins;
    expect(mpPageCoins(0, true, 150, 100, [])).toBe(base + 4);
    expect(mpPageCoins(0, true, 149, 100, [])).toBe(base + 3);
    expect(mpPageCoins(0, false, 100, 150, [])).toBe(base + 2);
    expect(mpPageCoins(0, true, 1, 0, [])).toBe(base + 4);
  });

  test("shops never offer word/discard-count upgrades", () => {
    for (let i = 0; i < 200; i++) {
      for (const o of mpOffers(i % 8)) if (o.kind === "upgrade") expect(["deep-pockets", "extra-chance"]).not.toContain(o.upgradeId);
    }
  });

  test("first to five Pages wins; abandoning concedes", () => {
    let m = started();
    m = { ...m, players: [{ ...m.players[0], wins: 4 }, m.players[1]] };
    m = ok(centreMove(m, 0));
    while (m.phase === "play") m = ok(passTurn(m, m.turn));
    expect(m.phase).toBe("finished");
    expect(m.winner).toBe(0);
    const quit = ok(abandon(started(), 0));
    expect(quit.winner).toBe(1);
    expect(quit.abandonedBy).toBe(0);
  });
});

import { mpStats } from "./mp-stats";
test("multiplayer stats count wins, losses, pages and streaks", () => {
  const row = (winner: 0 | 1, wins: number, at: string, status = "finished") => ({ player1: "u1", status, updated_at: at,
    public: { winner, players: [{ wins, bestPageInk: wins * 10 }, { wins: 1 }] } as never });
  const s = mpStats([row(0, 5, "1"), row(0, 5, "2"), row(1, 2, "3"), row(0, 5, "4"), row(1, 0, "5", "cancelled")], "u1");
  expect(s).toEqual({ played: 4, won: 3, lost: 1, winRate: 75, pages: 17, best: 50, bestStreak: 2 });
});

import { reorderPens } from "./multiplayer";
function withPens(m: MatchState, ids: string[]): MatchState {
  const p = m.players[0]!;
  const tpl = { penId: ids[0] } as never as MatchState["players"][0]["state"]["pens"][number];
  const pens = ids.map((penId) => ({ ...(tpl as object), penId })) as typeof p.state.pens;
  return { ...m, players: [{ ...p, state: { ...p.state, pens } }, m.players[1]] };
}
test("reorder rejects duplicated Pen ids (cannot clone a Pen)", () => {
  const m = withPens(started(), ["the-columnist", "fresh-ink"]);
  expect(reorderPens(m, 0, ["the-columnist", "the-columnist"])).toEqual({ error: "Invalid order." });
  expect(reorderPens(m, 0, ["the-columnist"])).toEqual({ error: "Invalid order." });
  const r = ok(reorderPens(m, 0, ["fresh-ink", "the-columnist"]));
  expect(r.players[0]!.state.pens.map((p) => p.penId)).toEqual(["fresh-ink", "the-columnist"]);
});
test("reorder is refused once a match is finished or cancelled", () => {
  const m = withPens(started(), ["the-columnist", "fresh-ink"]);
  const done = ok(abandon(m, 1));
  expect(reorderPens(done, 0, ["fresh-ink", "the-columnist"])).toEqual({ error: "Pens can't be reordered now." });
  expect(reorderPens({ ...done, phase: "cancelled" }, 0, ["fresh-ink", "the-columnist"])).toEqual({ error: "Pens can't be reordered now." });
});
test("win streak follows finish time, not later edits such as a rematch link", () => {
  const row = (winner: 0 | 1, finished: string, updated: string) => ({ player1: "u1", status: "finished", updated_at: updated, finished_at: finished,
    public: { winner, players: [{ wins: 5 }, { wins: 0 }] } as never });
  // Match "1" was won first but updated last (rematch claim); streak must still be W,W then L.
  const s = mpStats([row(0, "1", "9"), row(0, "2", "2"), row(1, "3", "3")], "u1");
  expect(s.bestStreak).toBe(2);
});
test("enhancement purchases stay hidden from the public view until both are Ready", () => {
  let m = started();
  m = ok(centreMove(m, m.turn));
  for (let i = 0; i < 20 && m.phase === "play"; i++) m = ok(passTurn(m, m.turn));
  expect(m.phase).toBe("bookstore");
  expect(publicView(m).boardTiles.length).toBeGreaterThan(0);
  const before = JSON.stringify(publicView(m).boardTiles);
  const p = m.players[0]!;
  const tiles = p.state.tiles.map((t) => ({ ...t, enhancement: "x2" as never }));
  const bought = { ...m, players: [{ ...p, state: { ...p.state, tiles } }, m.players[1]] } as MatchState;
  expect(JSON.stringify(publicView(bought).boardTiles)).toBe(before);
  expect(JSON.stringify(publicView(bought)).includes('"rack"')).toBe(false);
});
