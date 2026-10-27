import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { fetchMyGames } from "@/lib/games";
import { AppNav } from "@/components/AppNav";
import { ModeMenu } from "@/components/ModeMenu";
import { GameCard, visibleGames } from "@/components/GameCard";

export const Route = createFileRoute("/_authenticated/multiplayer")({
  head: () => ({
    meta: [
      { title: "Multiplayer — Sibble" },
      { name: "description", content: "Play Sibble with friends, practise solo, or continue your games in progress." },
      { property: "og:title", content: "Multiplayer — Sibble" },
      { property: "og:description", content: "Start a shared word game, practise solo and explore your game records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MultiplayerMenu,
});

function MultiplayerMenu() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const games = useQuery({
    queryKey: ["games", userId],
    queryFn: () => fetchMyGames(userId),
    enabled: Boolean(userId),
  });
  const ongoing = visibleGames(games.data, userId).filter((game) => game.status !== "finished");
  return (
    <main>
      <ModeMenu mode="Multiplayer"><AppNav showSignOut={false} /></ModeMenu>
      {games.isLoading || ongoing.length > 0 ? (
        <section className="mx-auto max-w-2xl space-y-3 px-6 pb-12" aria-label="Games in progress">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Games in progress</h2>
          {games.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : ongoing.map((game) => <GameCard key={game.id} game={game} userId={userId} />)}
        </section>
      ) : null}
    </main>
  );
}