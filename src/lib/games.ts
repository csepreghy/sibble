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

export async function saveState(gameId: string, state: GameState, status: string) {
  const { error } = await supabase
    .from("games")
    .update({ state: state as never, status })
    .eq("id", gameId);
  if (error) throw error;
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
