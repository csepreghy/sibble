import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { acceptSnapshot, CelebrationLedger, pageCompletionKey, stillCurrent } from "./mpPresentation";

const snap = (id: string, version: number, phase = "play", pageIndex?: number) => ({
  id, version, public: { phase, lastPage: pageIndex == null ? null : { pageIndex, coins: [4, 3] } },
});

describe("multiplayer presentation bookkeeping", () => {
  it("ignores older snapshots and snapshots for another match", () => {
    assert.equal(acceptSnapshot("a", 5, snap("a", 4)), false);
    assert.equal(acceptSnapshot("a", 5, snap("b", 9)), false);
    assert.equal(acceptSnapshot("a", 5, snap("a", 5)), true);
  });
  it("a fresh rematch at version 0 is accepted after switching IDs", () => {
    assert.equal(acceptSnapshot("rematch", -1, snap("rematch", 0)), true);
  });
  it("keys completed Pages only in bookstore/finished", () => {
    assert.equal(pageCompletionKey(snap("a", 1, "play", 0)), null);
    assert.equal(pageCompletionKey(snap("a", 1, "bookstore", 0)), "a:0");
    assert.equal(pageCompletionKey(snap("a", 1, "finished", 8)), "a:8");
  });
  it("does not replay the Page already completed when the match is first opened", () => {
    const l = new CelebrationLedger();
    assert.equal(l.observe(snap("a", 3, "bookstore", 0)), false);
    assert.equal(l.pending(snap("a", 4, "bookstore", 0)), null);
  });
  it("presents a newly completed Page once, whether via HTTP or realtime", () => {
    const l = new CelebrationLedger();
    l.observe(snap("a", 1));
    const s = snap("a", 2, "bookstore", 0);
    assert.equal(l.pending(s), "a:0");
    assert.equal(l.claim("a:0"), true);
    assert.equal(l.claim("a:0"), false);
    assert.equal(l.pending(snap("a", 3, "bookstore", 0)), null);
  });
  it("reset on match switch re-primes, so the new match's state is not replayed", () => {
    const l = new CelebrationLedger();
    l.observe(snap("a", 1));
    l.reset();
    assert.equal(l.observe(snap("b", 7, "bookstore", 2)), false);
    assert.equal(l.pending(snap("b", 8, "bookstore", 2)), null);
  });
  it("queued work from a previous match is dropped", () => {
    assert.equal(stillCurrent("a", "b"), false);
    assert.equal(stillCurrent("a", "a"), true);
  });
});
