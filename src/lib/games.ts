import { supabase } from "@/integrations/supabase/client";
import { createGameState, type GameState } from "@/lib/scrabble";

export interface GameRow {
  id: string;
  created_by: string;
  player1: string;
  player2: string | null;
  player1_name: string;
  player2_name: string;
  solo: boolean;
  status: string;
  state: GameState;
  created_at: string;
  updated_at: string;
}

export function displayNameOf(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return "Player";
  const meta = user.user_metadata ?? {};
  const full = (meta['full_name'] ?? meta['name']) as string | undefined;
  return full || (user.email ? user.email.split("@")[0]! : "Player");
}

export async function fetchMyGames(userId: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(`player1.eq.${userId},player2.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GameRow[];
}

export async function fetchGame(gameId: string) {
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as GameRow | null;
}

export async function createGame(opts: {
  userId: string;
  name: string;
  solo: boolean;
}): Promise<GameRow> {
  const state = createGameState();
  const { data, error } = await supabase
    .from("games")
    .insert({
      created_by: opts.userId,
      player1: opts.userId,
      player1_name: opts.name,
      player2_name: opts.solo ? "Player 2" : "Waiting…",
      solo: opts.solo,
      status: opts.solo ? "active" : "waiting",
      state: state as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as GameRow;
}

export async function deleteGame(gameId: string) {
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw error;
}

export async function joinGame(gameId: string, userId: string, name: string) {
  const { data, error } = await supabase
    .from("games")
    .update({ player2: userId, player2_name: name, status: "active" })
    .eq("id", gameId)
    .is("player2", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as GameRow | null;
}

export class ConflictError extends Error {
  constructor() {
    super("The board changed while you were playing.");
    this.name = "ConflictError";
  }
}

/**
 * Saves a turn. `expectedVersion` guards against two clients writing at the
 * same time and wiping each other's racks: the write only lands if the stored
 * state is still the one this client started from.
 */
export async function saveState(
  gameId: string,
  state: GameState,
  status: string,
  expectedVersion?: number | null,
) {
  const next: GameState = { ...state, version: (expectedVersion ?? 0) + 1 };
  let query = supabase
    .from("games")
    .update({ state: next as never, status })
    .eq("id", gameId);
  if (typeof expectedVersion === "number") {
    query = query.eq("state->>version", String(expectedVersion));
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new ConflictError();
  return next;
}

export interface OpponentRecord {
  name: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface PlayerStats {
  played: number;
  finished: number;
  ongoing: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  bestScore: number;
  bestWord: { word: string; score: number } | null;
  opponents: OpponentRecord[];
}

export function computeStats(games: GameRow[], userId: string): PlayerStats {
  const stats: PlayerStats = {
    played: 0,
    finished: 0,
    ongoing: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    bestScore: 0,
    bestWord: null,
    opponents: [],
  };
  const byOpponent = new Map<string, OpponentRecord>();

  for (const game of games) {
    if (game.solo) continue;
    const seat: 0 | 1 = game.player1 === userId ? 0 : 1;
    const other: 0 | 1 = seat === 0 ? 1 : 0;
    const scores = game.state?.scores ?? [0, 0];
    const mine = scores[seat] ?? 0;
    const theirs = scores[other] ?? 0;
    const opponentName = (other === 0 ? game.player1_name : game.player2_name) || "Waiting…";

    stats.played += 1;
    stats.pointsFor += mine;
    stats.pointsAgainst += theirs;

    for (const entry of game.state?.history ?? []) {
      if (entry.player !== seat) continue;
      if (entry.score > stats.bestScore) stats.bestScore = entry.score;
      if (!stats.bestWord || entry.score > stats.bestWord.score) {
        stats.bestWord = { word: entry.description, score: entry.score };
      }
    }

    const done = game.status === "finished";
    if (done) stats.finished += 1;
    else stats.ongoing += 1;

    const record =
      byOpponent.get(opponentName) ??
      {
        name: opponentName,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
    record.played += 1;
    record.pointsFor += mine;
    record.pointsAgainst += theirs;

    if (done) {
      const resignedBy = game.state?.resignedBy;
      if (resignedBy !== undefined && resignedBy !== null) {
        if (resignedBy === seat) {
          stats.losses += 1;
          record.losses += 1;
        } else {
          stats.wins += 1;
          record.wins += 1;
        }
      } else if (mine > theirs) {
        stats.wins += 1;
        record.wins += 1;
      } else if (mine < theirs) {
        stats.losses += 1;
        record.losses += 1;
      } else {
        stats.draws += 1;
        record.draws += 1;
      }
    }
    byOpponent.set(opponentName, record);
  }

  stats.opponents = [...byOpponent.values()].sort((a, b) => b.played - a.played);
  return stats;
}

export async function isAdmin(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}
