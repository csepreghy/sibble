// Pure helpers for multiplayer presentation bookkeeping (dedup, match switching, Page celebrations).
// Presentation only: none of this grants rewards or drives match transitions.

export interface SnapLike {
  id: string;
  version: number;
  public: { phase: string; lastPage?: { pageIndex: number; coins: number[] } | null; tiebreaks?: number };
}

/** A snapshot is applied only for the open match and never older than what is shown. */
export function acceptSnapshot(openId: string, shownVersion: number, s: SnapLike): boolean {
  return s.id === openId && s.version >= shownVersion;
}

/** Stable key for the most recently completed Page of a match, or null while none is completed. */
export function pageCompletionKey(s: SnapLike): string | null {
  const lp = s.public.lastPage;
  if (!lp || (s.public.phase !== "bookstore" && s.public.phase !== "finished")) return null;
  return `${s.id}:${lp.pageIndex}`;
}

/** Tracks which completed Pages were presented. The first snapshot of a match is primed (never replayed). */
export class CelebrationLedger {
  private seen = new Set<string>();
  private primed = false;
  reset() { this.seen.clear(); this.primed = false; }
  /** Record a snapshot as observed; returns true when it carries a not-yet-presented completed Page. */
  observe(s: SnapLike): boolean {
    const key = pageCompletionKey(s);
    if (!this.primed) { this.primed = true; if (key) this.seen.add(key); return false; }
    return !!key && !this.seen.has(key);
  }
  pending(s: SnapLike): string | null {
    const key = pageCompletionKey(s);
    return this.primed && key && !this.seen.has(key) ? key : null;
  }
  /** Claim a key for presentation exactly once. */
  claim(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}

/** Queued intents carry their originating match; work for a previous match is dropped. */
export function stillCurrent(originId: string, openId: string): boolean {
  return originId === openId;
}
