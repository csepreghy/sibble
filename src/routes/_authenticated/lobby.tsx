import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { createGame, displayNameOf, fetchMyGames, isAdmin } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { AppNav } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { GameCard, visibleGames } from "@/components/GameCard";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Your games — Sibble" },
      { name: "description", content: "Start a Scrabble game or pick up one you're already playing." },
      { property: "og:title", content: "Your games — Sibble" },
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
    navigate({ to: "/", replace: true });
  }

  const ongoing = visibleGames(games.data, userId).filter((game) => game.status !== "finished");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <BrandLogo className="mb-6 h-12 w-auto sm:h-14" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Hi, {displayNameOf(user)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ready for a game?</p>
        </div>
        <div className="flex items-center gap-2">
          <AppNav />
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      {admin.data ? (
        <div className="mt-8">
          <button
            type="button"
            disabled={start.isPending}
            onClick={() => start.mutate(true)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <User className="h-5 w-5 text-primary" /><span className="font-semibold">Solo practice</span>
          </button>
        </div>
      ) : null}

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Games in progress
        </h2>
        {games.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : ongoing.length === 0 ? (
          <p className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No games on the go. Start one above and send the link to whoever you want to play.
          </p>
        ) : (
          ongoing.map((game) => <GameCard key={game.id} game={game} userId={userId} />)
        )}
      </section>
    </main>
  );
}
