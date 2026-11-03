// Multiplayer Story statistics, derived from server-recorded finished matches.
import type { PublicMatch } from "./multiplayer";

export interface MpRow { player1: string; status: string; updated_at: string; public: PublicMatch }

export function mpStats(rows: MpRow[], userId: string) {
  const done = rows.filter((r) => r.status === "finished" && r.public.winner != null).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  let won = 0, pages = 0, best = 0, streak = 0, bestStreak = 0;
  for (const r of done) {
    const seat = r.player1 === userId ? 0 : 1;
    const me = r.public.players[seat];
    pages += me?.wins ?? 0;
    best = Math.max(best, me?.bestPageInk ?? 0);
    if (r.public.winner === seat) { won++; streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0;
  }
  const played = done.length;
  return { played, won, lost: played - won, winRate: played ? Math.round((won / played) * 100) : 0, pages, best, bestStreak };
}
