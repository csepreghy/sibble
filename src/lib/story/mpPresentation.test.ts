import { describe, expect, it } from "vitest";
import { acceptSnapshot, CelebrationLedger, pageCompletionKey, stillCurrent } from "./mpPresentation";

const snap = (id: string, version: number, phase = "play", pageIndex?: number) => ({
  id, version, public: { phase, lastPage: pageIndex == null ? null : { pageIndex, coins: [4, 3] } },
});

describe("multiplayer presentation bookkeeping", () => {
  it("ignores older snapshots and snapshots for another match", () => {
    expect(acceptSnapshot("a", 5, snap("a", 4))).toBe(false);
    expect(acceptSnapshot("a", 5, snap("b", 9))).toBe(false);
    expect(acceptSnapshot("a", 5, snap("a", 5))).toBe(true);
  });
  it("a fresh rematch at version 0 is accepted after switching IDs", () => {
    expect(acceptSnapshot("rematch", -1, snap("rematch", 0))).toBe(true);
  });
  it("keys completed Pages only in bookstore/finished", () => {
    expect(pageCompletionKey(snap("a", 1, "play", 0))).toBeNull();
    expect(pageCompletionKey(snap("a", 1, "bookstore", 0))).toBe("a:0");
    expect(pageCompletionKey(snap("a", 1, "finished", 8))).toBe("a:8");
  });
  it("does not replay the Page already completed when the match is first opened", () => {
    const l = new CelebrationLedger();
    expect(l.observe(snap("a", 3, "bookstore", 0))).toBe(false);
    expect(l.pending(snap("a", 4, "bookstore", 0))).toBeNull();
  });
  it("presents a newly completed Page once, whether via HTTP or realtime", () => {
    const l = new CelebrationLedger();
    l.observe(snap("a", 1));
    const s = snap("a", 2, "bookstore", 0);
    expect(l.pending(s)).toBe("a:0");
    expect(l.claim("a:0")).toBe(true);
    expect(l.claim("a:0")).toBe(false);
    expect(l.pending(snap("a", 3, "bookstore", 0))).toBeNull();
  });
  it("reset on match switch re-primes, so the new match's state is not replayed", () => {
    const l = new CelebrationLedger();
    l.observe(snap("a", 1));
    l.reset();
    expect(l.observe(snap("b", 7, "bookstore", 2))).toBe(false);
    expect(l.pending(snap("b", 8, "bookstore", 2))).toBeNull();
  });
  it("queued work from a previous match is dropped", () => {
    expect(stillCurrent("a", "b")).toBe(false);
    expect(stillCurrent("a", "a")).toBe(true);
  });
});
