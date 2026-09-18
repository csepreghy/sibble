import { supabase } from "@/integrations/supabase/client";
import { createGame, joinGame } from "@/lib/games";

export interface RematchInvite {
  id: string;
  from_user: string;
  to_user: string;
  from_name: string;
  previous_game_id: string | null;
  new_game_id: string;
  status: string;
  created_at: string;
}

/** Creates a fresh game and invites the other player into it. */
export async function sendRematchInvite(opts: {
  userId: string;
  name: string;
  opponentId: string;
  previousGameId: string;
}): Promise<RematchInvite> {
  const game = await createGame({ userId: opts.userId, name: opts.name, solo: false });
  const { data, error } = await supabase
    .from("rematch_invites")
    .insert({
      from_user: opts.userId,
      from_name: opts.name,
      to_user: opts.opponentId,
      previous_game_id: opts.previousGameId,
      new_game_id: game.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as RematchInvite;
}

export async function fetchIncomingInvites(userId: string) {
  const { data, error } = await supabase
    .from("rematch_invites")
    .select("*")
    .eq("to_user", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RematchInvite[];
}

export async function acceptRematchInvite(invite: RematchInvite, userId: string, name: string) {
  await joinGame(invite.new_game_id, userId, name);
  const { error } = await supabase
    .from("rematch_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);
  if (error) throw error;
  return invite.new_game_id;
}

export async function declineRematchInvite(inviteId: string) {
  const { error } = await supabase
    .from("rematch_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);
  if (error) throw error;
}
