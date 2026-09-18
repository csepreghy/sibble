import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { displayNameOf } from "@/lib/games";
import {
  acceptRematchInvite,
  declineRematchInvite,
  fetchIncomingInvites,
  type RematchInvite,
} from "@/lib/rematch";
import { Button } from "@/components/ui/button";

/**
 * Listens for rematch invitations anywhere in the signed-in app and shows a
 * popup on top of whatever the player is looking at (including the game-over
 * modal). Also moves the sender into the new game once it is accepted.
 */
export function RematchWatcher() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invites = useQuery({
    queryKey: ["rematch-invites", userId],
    queryFn: () => fetchIncomingInvites(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`rematch-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rematch_invites" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<RematchInvite> | null;
          if (!row) return;
          if (row.to_user === userId) {
            queryClient.invalidateQueries({ queryKey: ["rematch-invites", userId] });
          }
          if (row.from_user === userId && row.status === "accepted" && row.new_game_id) {
            toast.success("Your rematch was accepted — here we go!");
            navigate({ to: "/game/$gameId", params: { gameId: row.new_game_id } });
          }
          if (row.from_user === userId && row.status === "declined") {
            toast.message("Your rematch invitation was declined.");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, navigate]);

  const invite = invites.data?.[0] ?? null;

  const accept = useMutation({
    mutationFn: (item: RematchInvite) =>
      acceptRematchInvite(item, userId, displayNameOf(user)),
    onSuccess: (gameId) => {
      queryClient.invalidateQueries({ queryKey: ["rematch-invites", userId] });
      queryClient.invalidateQueries({ queryKey: ["games", userId] });
      navigate({ to: "/game/$gameId", params: { gameId } });
    },
    onError: () => toast.error("Couldn't join the rematch. Please try again."),
  });

  const decline = useMutation({
    mutationFn: (item: RematchInvite) => declineRematchInvite(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rematch-invites", userId] }),
    onError: () => toast.error("Couldn't decline that invitation."),
  });

  if (!invite) return null;
  const busy = accept.isPending || decline.isPending;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-label="Rematch invitation"
    >
      <div className="animate-in zoom-in duration-200 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-panel">
        <span className="text-5xl leading-none" aria-hidden>
          ⚔️
        </span>
        <p className="text-lg font-bold">{invite.from_name} wants a rematch</p>
        <p className="text-sm text-muted-foreground">
          A fresh board is waiting. Accept and it's on.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Button size="lg" disabled={busy} onClick={() => accept.mutate(invite)}>
            Accept rematch
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => decline.mutate(invite)}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
