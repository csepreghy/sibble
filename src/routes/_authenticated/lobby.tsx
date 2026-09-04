import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { createGame, displayNameOf, fetchMyGames, isAdmin } from "@/lib/games";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Your games — Tile Table" },
      { name: "description", content: "Start a Scrabble game or pick up one you're already playing." },
      { property: "og:title", content: "Your games — Tile Table" },
      { property: "og:description", content: "Start a game or continue one in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const games = useQuery({
    queryKey: ["games", userId],
    queryFn: () => fetchMyGames(userId),
    enabled: Boolean(userId),
  });

  const admin = useQuery({
    queryKey: ["admin", userId],
    queryFn: () => isAdmin(userId),
    enabled: Boolean(userId),
  });

  const start = useMutation({
    mutationFn: (solo: boolean) =>
      createGame({ userId, name: displayNameOf(user), solo }),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ["games", userId] });
      navigate({ to: "/game/$gameId", params: { gameId: game.id } });
    },
    onError: () => toast.error("Couldn't start the game. Please try again."),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const ongoing = (games.data ?? []).filter((game) => game.status !== "finished");
  const done = (games.data ?? []).filter((game) => game.status === "finished");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your games</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {displayNameOf(user)}</p>
        </div>
        <div className="flex items-center gap-2">
          <AppNav />
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>


      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" disabled={start.isPending} onClick={() => start.mutate(false)}>
          Start a game & get a link
        </Button>
        {admin.data ? (
          <Button
            size="lg"
            variant="secondary"
            disabled={start.isPending}
            onClick={() => start.mutate(true)}
          >
            Solo practice board
          </Button>
        ) : null}
      </div>

      <section className="mt-10 space-y-3">
        {games.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (games.data?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No games yet. Start one above and send the link to your sister.
          </p>
        ) : (
          games.data!.map((game) => (
            <Link
              key={game.id}
              to="/game/$gameId"
              params={{ gameId: game.id }}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <div>
                <p className="font-semibold">
                  {game.solo
                    ? "Solo practice board"
                    : `${game.player1_name} vs ${game.player2 ? game.player2_name : "waiting for a player"}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {game.state?.scores
                    ? `${game.state.scores[0]} – ${game.state.scores[1]}`
                    : "0 – 0"}{" "}
                  · {game.status === "finished" ? "finished" : game.status}
                </p>
              </div>
              <span className="text-sm text-primary">Open</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
